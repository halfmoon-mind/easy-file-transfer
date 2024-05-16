const signalingServer = new WebSocket('ws://ec2-43-201-8-191.ap-northeast-2.compute.amazonaws.com:8081');
// Initialize RTCPeerConnection
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

let dataChannel;
const CHUNK_SIZE = 16384; // 16KB 청크 크기 설정
let receivedFiles = []; // 수신된 파일을 저장하기 위한 배열

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    signalingServer.send(JSON.stringify({ candidate: event.candidate }));
    console.log('ICE candidate sent:', event.candidate);
  } else {
    console.log('All ICE candidates have been sent');
  }
};

// Handle incoming signaling messages
signalingServer.onmessage = async (message) => {
  let data;

  // Check if the message data is a Blob
  if (message.data instanceof Blob) {
    try {
      const text = await message.data.text();
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse signaling message as JSON:', message.data);
      return;
    }
  } else {
    try {
      data = JSON.parse(message.data);
    } catch (e) {
      console.error('Failed to parse signaling message as JSON:', message.data);
      return;
    }
  }

  if (data.candidate) {
    console.log('Received ICE candidate:', data.candidate);
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('ICE candidate added successfully');
    } catch (e) {
      console.error('Error adding received ICE candidate', e);
    }
  } else if (data.sdp) {
    console.log('Received SDP:', data.sdp);
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      console.log('Remote SDP set successfully');
      if (data.sdp.type === 'offer') {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingServer.send(JSON.stringify({ sdp: peerConnection.localDescription }));
        console.log('Answer sent:', peerConnection.localDescription);
      }
    } catch (e) {
      console.error('Error setting remote SDP', e);
    }
  }
};

signalingServer.onopen = () => {
  console.log('WebSocket connection established');
  createConnection(); // Start the connection process once WebSocket is open
};

signalingServer.onerror = (error) => {
  console.error('WebSocket error:', error);
};

signalingServer.onclose = () => {
  console.log('WebSocket connection closed');
};

// Create data channel and handle file reception
peerConnection.ondatachannel = (event) => {
  console.log('Data channel received:', event.channel);
  dataChannel = event.channel;
  setupDataChannel(dataChannel);
};

const setupDataChannel = (channel) => {
  channel.onopen = () => {
    console.log('Data channel is open');
    document.getElementById('sendButton').disabled = false; // Enable send button when data channel is open
  };
  channel.onclose = () => {
    console.log('Data channel is closed');
    document.getElementById('sendButton').disabled = true; // Disable send button when data channel is closed
  };
  channel.onmessage = (event) => {
    console.log('Received file:', event.data);
    const blob = new Blob([event.data]);
    const fileName = `received_file_${receivedFiles.length + 1}`;
    receivedFiles.push({ name: fileName, blob: blob });
    updateReceivedFilesList();
  };
  channel.onerror = (error) => {
    console.error('Data channel error:', error);
  };
};

const updateReceivedFilesList = () => {
  const receivedFilesTextArea = document.getElementById('receivedFiles');
  receivedFilesTextArea.value = receivedFiles.map((file) => file.name).join('\n');
};

const sendFileInChunks = (file) => {
  const reader = new FileReader();
  let offset = 0;

  reader.onload = () => {
    if (dataChannel.readyState === 'open') {
      const chunk = reader.result;
      dataChannel.send(chunk);
      console.log('Chunk sent:', offset, chunk);

      offset += chunk.byteLength;
      if (offset < file.size) {
        readSlice(offset);
      } else {
        console.log('All chunks sent');
      }
    }
  };

  const readSlice = (o) => {
    const slice = file.slice(o, o + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  };

  readSlice(0);
};

// Handle file sending
document.getElementById('sendButton').onclick = () => {
  const file = document.getElementById('fileInput').files[0];
  if (file && dataChannel && dataChannel.readyState === 'open') {
    sendFileInChunks(file);
    console.log('File sent:', file.name);
  } else {
    alert('No file selected or data channel is not established.');
  }
};

// Handle file download
document.getElementById('downloadButton').onclick = () => {
  const receivedFilesTextArea = document.getElementById('receivedFiles');
  const selectedFileName = receivedFilesTextArea.value.split('\n').find((fileName) => fileName.trim() !== '');
  const fileToDownload = receivedFiles.find((file) => file.name === selectedFileName);
  if (fileToDownload) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(fileToDownload.blob);
    link.download = fileToDownload.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert('No file selected for download.');
  }
};

// Create data channel and offer
const createConnection = async () => {
  dataChannel = peerConnection.createDataChannel('fileTransfer');
  setupDataChannel(dataChannel);

  dataChannel.onopen = () => {
    console.log('Data channel (initiator) is open');
    document.getElementById('sendButton').disabled = false;
  };

  dataChannel.onclose = () => {
    console.log('Data channel (initiator) is closed');
    document.getElementById('sendButton').disabled = true;
  };

  dataChannel.onmessage = (event) => {
    console.log('Received file:', event.data);
    const blob = new Blob([event.data]);
    const fileName = `received_file_${receivedFiles.length + 1}`;
    receivedFiles.push({ name: fileName, blob: blob });
    updateReceivedFilesList();
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalingServer.send(JSON.stringify({ sdp: peerConnection.localDescription }));
  console.log('Offer sent:', peerConnection.localDescription);
};

// Initially disable the send button
document.getElementById('sendButton').disabled = true;

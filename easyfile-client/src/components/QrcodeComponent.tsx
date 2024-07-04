import { useEffect } from 'react';
import QRCode from 'qrcode';

export const QrCodeImage = () => {
  useEffect(() => {
    setQRCode();
  }, []);

  function setQRCode(): void {
    const canvas = document.getElementById('roomCode');
    QRCode.toCanvas(canvas, window.location.href, {
      color: { dark: '#000000' },
      scale: 4
    });
  }

  return (
    <div>
      <canvas id="roomCode" />
    </div>
  );
};

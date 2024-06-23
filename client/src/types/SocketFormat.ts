export default interface SocketFormat {
    /// 송신자 Socket ID
    sender: string;
    /// 수신자 Socket ID
    receiver: string;
    /// 메시지
    data: any;
}

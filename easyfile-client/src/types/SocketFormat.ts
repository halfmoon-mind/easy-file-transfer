/**
 * Socket 통신 포맷
 * @interface SocketFormat
 * @property {string} sender 송신자 Socket ID
 * @property {string} receiver 수신자 Socket ID
 * @property {any} data 메시지
 */
export default interface SocketFormat {
  /// 송신자 Socket ID
  sender: string;
  /// 수신자 Socket ID
  receiver: string;
  /// 메시지
  data: any;
}

import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

/** To connect to socket, use http:// even the server is running on https */
@WebSocketGateway(3001, {
  namespace: 'core',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class CoreSocketGateway {
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}

import { Module } from '@nestjs/common';
import { CoreSocketGateway } from '../../gateways/core-socket/core-socket.gateway';

@Module({
  providers: [CoreSocketGateway],
  exports: [CoreSocketGateway],
})
export class CoreSocketModule {}

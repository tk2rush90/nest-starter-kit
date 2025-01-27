import { Module } from '@nestjs/common';
import { CoreSocketGateway } from './core-socket.gateway';

@Module({
  providers: [CoreSocketGateway],
  exports: [CoreSocketGateway],
})
export class CoreSocketModule {}

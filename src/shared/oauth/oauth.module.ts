import { Module } from '@nestjs/common';
import { OauthService } from './oauth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [OauthService],
  exports: [OauthService],
})
export class OauthModule {}

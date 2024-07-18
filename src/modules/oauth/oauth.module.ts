import { Module } from '@nestjs/common';
import { OauthService } from '../../services/oauth/oauth.service';

@Module({
  providers: [OauthService],
  exports: [OauthService],
})
export class OauthModule {}

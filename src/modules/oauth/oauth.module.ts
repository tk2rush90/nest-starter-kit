import { Module } from '@nestjs/common';
import { OauthService } from '../../services/oauth/oauth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [OauthService],
  exports: [OauthService],
})
export class OauthModule {}

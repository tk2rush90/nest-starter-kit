import { Module } from '@nestjs/common';
import { AuthApiController } from './auth-api.controller';
import { AuthApiService } from './auth-api.service';
import { AccountModule } from '../../shared/account/account.module';
import { SignedAccountModule } from '../../shared/signed-account/signed-account.module';
import { OauthModule } from '../../shared/oauth/oauth.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [AccountModule, SignedAccountModule, OauthModule, MailModule],
  controllers: [AuthApiController],
  providers: [AuthApiService],
  exports: [AuthApiService],
})
export class AuthApiModule {}

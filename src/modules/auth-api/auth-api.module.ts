import { Module } from '@nestjs/common';
import { AuthApiController } from '../../controllers/auth-api/auth-api.controller';
import { AuthApiService } from '../../services/auth-api/auth-api.service';
import { AccountModule } from '../account/account.module';
import { SignedAccountModule } from '../signed-account/signed-account.module';
import { MailService } from '../../services/mail/mail.service';
import { OauthModule } from '../oauth/oauth.module';
import { ArchivedAccountModule } from '../archived-account/archived-account.module';

@Module({
  imports: [AccountModule, SignedAccountModule, OauthModule, ArchivedAccountModule],
  controllers: [AuthApiController],
  providers: [AuthApiService, MailService],
  exports: [AuthApiService],
})
export class AuthApiModule {}

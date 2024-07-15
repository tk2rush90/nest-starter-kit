import { Module } from '@nestjs/common';
import { AuthApiController } from '../../controllers/auth-api/auth-api.controller';
import { AuthApiService } from '../../services/auth-api/auth-api.service';
import { AccountModule } from '../account/account.module';
import { SignedAccountModule } from '../signed-account/signed-account.module';
import { MailService } from '../../services/mail/mail.service';

@Module({
  imports: [AccountModule, SignedAccountModule],
  controllers: [AuthApiController],
  providers: [AuthApiService, MailService],
  exports: [AuthApiService],
})
export class AuthApiModule {}

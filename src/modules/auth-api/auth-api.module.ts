import { Module } from '@nestjs/common';
import { AuthApiController } from '../../controllers/auth-api/auth-api.controller';
import { MailService } from '../../services/mail/mail.service';
import { AccountModule } from '../account/account.module';
import { CryptoService } from '../../services/crypto/crypto.service';
import { SignedAccountModule } from '../signed-account/signed-account.module';

@Module({
  imports: [AccountModule, SignedAccountModule],
  controllers: [AuthApiController],
  providers: [MailService, CryptoService],
})
export class AuthApiModule {}

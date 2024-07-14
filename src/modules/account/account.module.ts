import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { AccountService } from '../../services/account/account.service';
import { SignedAccountModule } from '../signed-account/signed-account.module';
import { MailService } from '../../services/mail/mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), forwardRef(() => SignedAccountModule)],
  providers: [AccountService, MailService],
  exports: [AccountService],
})
export class AccountModule {}

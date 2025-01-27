import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { AccountService } from './account.service';
import { SignedAccountModule } from '../signed-account/signed-account.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), SignedAccountModule],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}

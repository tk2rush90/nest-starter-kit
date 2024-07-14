import { Module } from '@nestjs/common';
import { SignedAccountService } from '../../services/signed-account/signed-account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignedAccount } from '../../entities/signed-account';

@Module({
  imports: [TypeOrmModule.forFeature([SignedAccount])],
  providers: [SignedAccountService],
  exports: [SignedAccountService],
})
export class SignedAccountModule {}

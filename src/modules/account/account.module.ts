import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { SignedAccount } from '../../entities/signed-account';
import { AccountService } from '../../services/account/account.service';
import { CryptoService } from '../../services/crypto/crypto.service';
import { JwtService } from '../../services/jwt/jwt.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account, SignedAccount]), FileModule],
  providers: [AccountService, CryptoService, JwtService],
  exports: [AccountService],
})
export class AccountModule {}

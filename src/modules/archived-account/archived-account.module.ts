import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivedAccount } from '../../entities/archived-account';
import { ArchivedAccountService } from '../../services/archived-account/archived-account.service';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [TypeOrmModule.forFeature([ArchivedAccount]), AccountModule],
  providers: [ArchivedAccountService],
  exports: [ArchivedAccountService],
})
export class ArchivedAccountModule {}

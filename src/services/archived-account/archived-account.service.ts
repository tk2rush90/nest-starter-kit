import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArchivedAccount } from '../../entities/archived-account';
import { EntityManager, Repository } from 'typeorm';
import { Account } from '../../entities/account';
import { AccountService } from '../account/account.service';
import { createWrapper, getTargetRepository } from '../../utils/typeorm';

@Injectable()
export class ArchivedAccountService {
  constructor(
    @InjectRepository(ArchivedAccount) private readonly _archivedAccountRepository: Repository<ArchivedAccount>,
    private readonly _accountService: AccountService,
  ) {}

  /**
   * Create archived account.
   * @param account
   * @param entityManager
   */
  async createArchivedAccount(account: Account, entityManager?: EntityManager): Promise<ArchivedAccount> {
    const archivedAccountRepository = getTargetRepository(this._archivedAccountRepository, entityManager);

    const accountJsonDto = this._accountService.toAccountJsonDto(account);

    return createWrapper(archivedAccountRepository, {
      accountId: account.id,
      account: accountJsonDto,
      createdAt: new Date(),
    });
  }
}

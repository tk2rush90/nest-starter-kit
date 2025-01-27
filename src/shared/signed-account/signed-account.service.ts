import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SignedAccount } from '../../entities/signed-account';
import { Repository } from 'typeorm';
import { Account } from '../../entities/account';
import { createWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { YEAR } from '../../constants/milliseconds';
import { encrypt } from '../../utils/crypto';
import { signToken } from '../../utils/jwt';
import { EntityManagerDto } from '../../dtos/entity-manager-dto';

@Injectable()
export class SignedAccountService {
  constructor(@InjectRepository(SignedAccount) private readonly repository: Repository<SignedAccount>) {}

  async markAccountAsSigned({
    accountId,
    email,
    salt,
    entityManager,
  }: Pick<SignedAccount, 'accountId'> & Pick<Account, 'email' | 'salt'> & Partial<EntityManagerDto>): Promise<string> {
    // Get repository.
    const repository = getTargetRepository(this.repository, entityManager);

    // Sign new access token.
    const accessToken = await signToken({
      id: accountId,
      email,
    });

    // Encrypt signed token with `salt`.
    const encryptedAccessToken = encrypt(accessToken, salt);

    await createWrapper(repository, {
      accessToken: encryptedAccessToken,
      accountId,
      createdAt: new Date(),
      expiredAt: new Date(Date.now() + YEAR), // Expired after 1 year.
    });

    // Returns.
    return accessToken;
  }

  /** `accessToken` 은 encrypt 되어야 함 */
  async getOneByUnique({
    accountId,
    accessToken,
  }: Pick<SignedAccount, 'accountId' | 'accessToken'>): Promise<SignedAccount> {
    return getOneWrapper(this.repository, {
      where: {
        accountId,
        accessToken,
      },
    });
  }

  async updateExpiryDate({ id }: Pick<SignedAccount, 'id'>): Promise<void> {
    // Update expiry date of `SignedAccount`.
    await this.repository.update(
      {
        id,
      },
      {
        expiredAt: new Date(Date.now() + YEAR), // Expired after 1 year.
      },
    );
  }

  async delete({ id }: Pick<SignedAccount, 'id'>): Promise<void> {
    await this.repository.delete({
      id,
    });
  }
}

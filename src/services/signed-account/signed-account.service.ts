import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SignedAccount } from '../../entities/signed-account';
import { EntityManager, Repository } from 'typeorm';
import { Account } from '../../entities/account';
import { createWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { YEAR } from '../../constants/milliseconds';
import { SIGN_REQUIRED } from '../../constants/errors';
import { encrypt } from '../../utils/crypto';
import { signToken } from '../../utils/jwt';

@Injectable()
export class SignedAccountService {
  constructor(@InjectRepository(SignedAccount) private readonly _signedAccountRepository: Repository<SignedAccount>) {}

  /**
   * Create `SignedAccount` to mark `Account` as signed.
   * It creates new access token for `Account`.
   * @param account - `Account` to mark as signed.
   * @param entityManager - `EntityManager` when using transaction.
   */
  async markAccountAsSigned(account: Account, entityManager?: EntityManager): Promise<string> {
    // Get repository.
    const signedAccountRepository = getTargetRepository(this._signedAccountRepository, entityManager);

    // Sign new access token.
    const accessToken = await signToken({
      id: account.id,
      email: account.email,
    });

    // Encrypt signed token with `salt`.
    const encryptedAccessToken = encrypt(accessToken, account.salt);

    await createWrapper(signedAccountRepository, {
      accessToken: encryptedAccessToken,
      accountId: account.id,
      createdAt: new Date(),
      expiredAt: new Date(Date.now() + YEAR), // Expired after 1 year.
    });

    // Returns.
    return accessToken;
  }

  /**
   * Get signed account.
   * @param account
   * @param encryptedAccessToken
   */
  async getSignedAccount(account: Account, encryptedAccessToken: string): Promise<SignedAccount> {
    return getOneWrapper(
      this._signedAccountRepository,
      {
        where: {
          accountId: account.id,
          accessToken: encryptedAccessToken,
        },
      },
      SIGN_REQUIRED,
    );
  }

  /**
   * Update expiry date of signed account.
   * @param signedAccount
   */
  async updateExpiryDate(signedAccount: SignedAccount): Promise<void> {
    // Update expiry date of `SignedAccount`.
    await this._signedAccountRepository.update(
      {
        id: signedAccount.id,
      },
      {
        expiredAt: new Date(Date.now() + YEAR), // Expired after 1 year.
      },
    );
  }

  /**
   * Delete signed account.
   * @param signedAccount
   */
  async deleteSignedAccount(signedAccount: SignedAccount): Promise<void> {
    await this._signedAccountRepository.delete({
      id: signedAccount.id,
    });
  }
}

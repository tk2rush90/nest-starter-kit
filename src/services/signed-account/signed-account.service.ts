import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SignedAccount } from '../../entities/signed-account';
import { EntityManager, Repository } from 'typeorm';
import { Account } from '../../entities/account';
import { getRepository } from '../../utils/typeorm';
import { YEAR } from '../../constants/milliseconds';
import { SIGN_REQUIRED, UNEXPECTED_ERROR } from '../../constants/errors';
import { JwtService } from '../jwt/jwt.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class SignedAccountService {
  private readonly _logger = new Logger('SignedAccountService');

  constructor(
    @InjectRepository(SignedAccount) private readonly _signedAccountRepository: Repository<SignedAccount>,
    private readonly _jwtService: JwtService,
    private readonly _cryptoService: CryptoService,
  ) {}

  /**
   * Create `SignedAccount` to mark `Account` as signed.
   * It creates new access token for `Account`.
   * @param account - `Account` to mark as signed.
   * @param entityManager - `EntityManager` when using transaction.
   * @returns Returns created access token.
   */
  async markAccountAsSigned(account: Account, entityManager: EntityManager): Promise<string> {
    // Get repository.
    const signedAccountRepository = getRepository(SignedAccount, this._signedAccountRepository, entityManager);

    // Sign new access token.
    const accessToken = await this._jwtService.sign({
      id: account.id,
      email: account.email,
    });

    // Encrypt signed token with `salt`.
    const encryptedAccessToken = this._cryptoService.encrypt(accessToken, account.salt);

    // Create `SignedAccount`.
    const signedAccount = signedAccountRepository.create({
      accessToken: encryptedAccessToken,
      accountId: account.id,
      expiredAt: new Date(Date.now() + YEAR), // Expired after 1 year.
    });

    // Save `SignedAccount`.
    await signedAccountRepository.save(signedAccount).catch((e) => {
      this._logger.error('Failed to save signed account: ' + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    });

    // Returns.
    return accessToken;
  }

  /** Get signed account with account entity and encrypted access token. It throws exception when not found */
  async getSignedAccount(account: Account, encryptedAccessToken: string): Promise<SignedAccount> {
    // Find `SignedAccount`
    const signedAccount = await this._signedAccountRepository
      .findOne({
        where: {
          accountId: account.id,
          accessToken: encryptedAccessToken,
        },
      })
      .catch((e) => {
        this._logger.error('Failed to find SignedAccount account: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });

    // When `SignedAccount` not found, throw exception.
    if (!signedAccount) {
      throw new UnauthorizedException(SIGN_REQUIRED);
    }

    return signedAccount;
  }

  /** Update expiry date of signed account */
  async updateExpiryDate(signedAccount: SignedAccount): Promise<void> {
    // Update expiry date of `SignedAccount`.
    await this._signedAccountRepository
      .update(
        {
          id: signedAccount.id,
        },
        {
          expiredAt: new Date(Date.now() + YEAR), // Expired after 1 year.
        },
      )
      .catch((e) => {
        this._logger.error('Failed to update expiry date: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }
}

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { IsNull, Repository } from 'typeorm';
import { createWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { YEAR } from '../../constants/milliseconds';
import { SIGN_REQUIRED } from '../../constants/errors';
import { AccountDto } from '../../dtos/account-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { SignedAccountService } from '../signed-account/signed-account.service';
import { createSalt, encrypt } from '../../utils/crypto';
import { verifyToken } from '../../utils/jwt';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { AccountJsonDto } from '../../dtos/account-json-dto';
import { EntityManagerDto } from '../../dtos/entity-manager-dto';

/** A service that contains database related features for `Account` */
@Injectable()
export class AccountService {
  private readonly _logger = new Logger('AccountService');

  constructor(
    @InjectRepository(Account) private readonly _repository: Repository<Account>,
    private readonly _signedAccountService: SignedAccountService,
  ) {}

  async isEmailDuplicated({ email }: Pick<Account, 'email'>): Promise<boolean> {
    const accountCount = await this._repository.count({
      where: {
        email,
      },
    });

    return accountCount > 0;
  }

  async isNicknameDuplicated({ nickname }: Pick<Account, 'nickname'>): Promise<boolean> {
    const accountCount = await this._repository.count({
      where: {
        nickname,
      },
    });

    return accountCount > 0;
  }

  async getOneByEmail({ email }: Pick<Account, 'email'>): Promise<Account> {
    return getOneWrapper(this._repository, {
      where: {
        email,
      },
    });
  }

  async getOneByAccessToken(accessToken: string): Promise<Account> {
    // Verify access token.
    const payload = await verifyToken(accessToken).catch((e) => {
      this._logger.error('Failed to verify access token: ' + e.toString(), e.stack);

      throw new UnauthorizedException(SIGN_REQUIRED);
    });

    // Get `Account` by email from verified token.
    return this.getOneByEmail(payload.email);
  }

  async getOneById({ id }: Pick<Account, 'id'>): Promise<Account> {
    return getOneWrapper(this._repository, {
      where: {
        id,
      },
    });
  }

  async create({
    email,
    nickname,
    oauthProvider = null,
    oauthId = null,
    avatarUrl = null,
    entityManager,
  }: Pick<Account, 'email' | 'nickname'> &
    Partial<Pick<Account, 'oauthProvider' | 'oauthId' | 'avatarUrl'>> &
    Partial<EntityManagerDto>): Promise<Account> {
    // Get target repository.
    const repository = getTargetRepository(this._repository, entityManager);

    // Create random salt string.
    const salt = createSalt();

    return createWrapper(repository, {
      email,
      nickname,
      salt,
      oauthProvider,
      oauthId,
      avatarUrl,
      accountExpiredAt: new Date(Date.now() + YEAR),
      createdAt: new Date(),
    });
  }

  async updateAvatarUrl({
    id,
    avatarUrl,
    entityManager,
  }: Pick<Account, 'id' | 'avatarUrl'> & Partial<EntityManagerDto>): Promise<void> {
    const repository = getTargetRepository(this._repository, entityManager);

    await repository.update(
      {
        id,
      },
      {
        avatarUrl,
      },
    );
  }

  async updateNickname({
    id,
    nickname,
    entityManager,
  }: Pick<Account, 'id' | 'nickname'> & Partial<EntityManagerDto>): Promise<void> {
    const repository = getTargetRepository(this._repository, entityManager);

    await repository.update(
      {
        id,
      },
      {
        nickname,
      },
    );
  }

  /**
   * Validate provided `accessToken`.
   * Validation will be done in 3 steps.
   * 1. Verify token.
   * 2. Check `Account` existence.
   * 3. Check `SignedAccount` existence with `Account` and `accessToken`.
   * When validation failed, it throws proper exceptions.
   * After all validations passed, updates expiry date of `SignedAccount`.
   * @param accessToken - Access token to validate.
   */
  async validateAccessToken(accessToken: string): Promise<Account> {
    const account = await this.getOneByAccessToken(accessToken);

    // Encrypt access token to find `SignedAccount`.
    const encryptedAccessToken = encrypt(accessToken, account.salt);

    // Find `SignedAccount`
    const signedAccount = await this._signedAccountService.getOneByUnique({
      accountId: account.id,
      accessToken: encryptedAccessToken,
    });

    // Update expiry date.
    await this._signedAccountService.updateExpiryDate({
      id: signedAccount.id,
    });

    // Return account.
    return account;
  }

  async delete({ id, entityManager }: Pick<Account, 'id'> & Partial<EntityManagerDto>): Promise<void> {
    const repository = getTargetRepository(this._repository, entityManager);

    // Delete account.
    await repository.delete({
      id,
    });
  }

  async findOneByOauth({
    oauthId,
    oauthProvider,
  }: Pick<Account, 'oauthId' | 'oauthProvider'>): Promise<Account | null> {
    return this._repository.findOne({
      where: {
        oauthProvider: oauthProvider ? oauthProvider : IsNull(),
        oauthId: oauthId ? oauthId : IsNull(),
      },
    });
  }

  async getOneByOauth({ oauthId, oauthProvider }: Pick<Account, 'oauthId' | 'oauthProvider'>): Promise<Account> {
    return getOneWrapper(this._repository, {
      where: {
        oauthProvider: oauthProvider ? oauthProvider : IsNull(),
        oauthId: oauthId ? oauthId : IsNull(),
      },
    });
  }

  /**
   * Convert `Account` to `AccountDto`.
   * @param account - `Account` to convert.
   */
  toAccountDto(account: Account): AccountDto {
    return new AccountDto({
      id: account.id,
      nickname: account.nickname,
    });
  }

  /**
   * Convert `Account` to `ProfileDto`.
   * @param account - `Account` to convert.
   * @param accessToken - Access token to set to `ProfileDto`.
   */
  toProfileDto(account: Account, accessToken: string): ProfileDto {
    // Create `ProfileDto` and return.
    return new ProfileDto({
      id: account.id,
      avatarUrl: account.avatarUrl,
      nickname: account.nickname,
      accessToken,
    });
  }

  /**
   * To deleted account.
   * @param account
   */
  toDeletedAccountDto(account: Account): DeletedAccountDto {
    return new DeletedAccountDto({
      ...this.toAccountDto(account),
      email: account.email,
      oauthProvider: account.oauthProvider,
      oauthId: account.oauthId,
    });
  }

  /**
   * To account json dto.
   * @param account
   */
  toAccountJsonDto(account: Account): AccountJsonDto {
    return new AccountJsonDto({
      id: account.id,
      salt: account.salt,
      email: account.email,
      nickname: account.nickname,
      otp: account.otp,
      otpExpiredAt: account.otpExpiredAt,
      avatarUrl: account.avatarUrl,
      oauthProvider: account.oauthProvider,
      oauthId: account.oauthId,
      accountExpiredAt: account.accountExpiredAt,
      createdAt: account.createdAt,
    });
  }
}

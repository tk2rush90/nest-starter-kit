import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { IsNull, Repository } from 'typeorm';
import {
  createWrapper,
  deleteOneWrapper,
  getOneWrapper,
  getTargetRepository,
  updateOneWrapper,
} from '../../utils/typeorm';
import { DUPLICATED_EMAIL, DUPLICATED_NICKNAME, SIGN_REQUIRED } from '../../constants/errors';
import { AccountDto } from '../../dtos/account-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { SignedAccountService } from '../signed-account/signed-account.service';
import { createSalt, encrypt } from '../../utils/crypto';
import { verifyToken } from '../../utils/jwt';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { EntityManagerDto } from '../../dtos/entity-manager-dto';
import { createRandomNickname } from '../../utils/string';

@Injectable()
export class AccountService {
  private readonly _logger = new Logger('AccountService');

  constructor(
    @InjectRepository(Account) private readonly repository: Repository<Account>,
    private readonly signedAccountService: SignedAccountService,
  ) {}

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
    const repository = getTargetRepository(this.repository, entityManager);

    const salt = createSalt();

    return createWrapper(repository, {
      email,
      nickname,
      salt,
      oauthProvider,
      oauthId,
      avatarUrl,
      createdAt: new Date(),
    });
  }

  async getOneByEmail({ email }: Pick<Account, 'email'>): Promise<Account> {
    return getOneWrapper(this.repository, {
      where: {
        email,
      },
    });
  }

  async getOneByAccessToken(accessToken: string): Promise<Account> {
    const payload = await verifyToken(accessToken).catch((e) => {
      this._logger.error(e.toString(), e.stack);

      throw new UnauthorizedException(SIGN_REQUIRED);
    });

    return this.getOneByEmail(payload.email);
  }

  async getOneById({ id }: Pick<Account, 'id'>): Promise<Account> {
    return getOneWrapper(this.repository, {
      where: {
        id,
      },
    });
  }

  async findOneByOauth({
    oauthId,
    oauthProvider,
  }: Pick<Account, 'oauthId' | 'oauthProvider'>): Promise<Account | null> {
    return this.repository.findOne({
      where: {
        oauthProvider: oauthProvider ? oauthProvider : IsNull(),
        oauthId: oauthId ? oauthId : IsNull(),
      },
    });
  }

  async getOneByOauth({ oauthId, oauthProvider }: Pick<Account, 'oauthId' | 'oauthProvider'>): Promise<Account> {
    return getOneWrapper(this.repository, {
      where: {
        oauthProvider: oauthProvider ? oauthProvider : IsNull(),
        oauthId: oauthId ? oauthId : IsNull(),
      },
    });
  }

  async findByNickname({
    nickname,
    entityManager,
  }: Pick<Account, 'nickname'> & Partial<EntityManagerDto>): Promise<Account | null> {
    const repository = getTargetRepository(this.repository, entityManager);

    return repository.findOne({
      where: {
        nickname,
      },
    });
  }

  async updateAvatarUrl({
    id,
    avatarUrl,
    entityManager,
  }: Pick<Account, 'id' | 'avatarUrl'> & Partial<EntityManagerDto>): Promise<Account> {
    const repository = getTargetRepository(this.repository, entityManager);

    return updateOneWrapper(
      repository,
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
  }: Pick<Account, 'id' | 'nickname'> & Partial<EntityManagerDto>): Promise<Account> {
    const repository = getTargetRepository(this.repository, entityManager);

    return updateOneWrapper(
      repository,
      {
        id,
      },
      {
        nickname,
      },
    );
  }

  async delete({ id, entityManager }: Pick<Account, 'id'> & Partial<EntityManagerDto>): Promise<void> {
    const repository = getTargetRepository(this.repository, entityManager);

    await deleteOneWrapper(repository, {
      id,
    });
  }

  async isEmailDuplicated({ email }: Pick<Account, 'email'>): Promise<boolean> {
    const accountCount = await this.repository.count({
      where: {
        email,
      },
    });

    return accountCount > 0;
  }

  async isNicknameDuplicated({ nickname }: Pick<Account, 'nickname'>): Promise<boolean> {
    const accountCount = await this.repository.count({
      where: {
        nickname,
      },
    });

    return accountCount > 0;
  }

  async checkDuplicated({ email, nickname }: Partial<Pick<Account, 'email' | 'nickname'>>): Promise<void> {
    if (email && (await this.isEmailDuplicated({ email }))) {
      throw new ConflictException(DUPLICATED_EMAIL);
    }

    if (nickname && (await this.isNicknameDuplicated({ nickname }))) {
      throw new ConflictException(DUPLICATED_NICKNAME);
    }
  }

  /** 액세스 토큰 검증 후 Account 리턴 */
  async validateAccessToken(accessToken: string): Promise<Account> {
    const account = await this.getOneByAccessToken(accessToken);

    const encryptedAccessToken = encrypt(accessToken, account.salt);

    const signedAccount = await this.signedAccountService.getOneByUnique({
      accountId: account.id,
      accessToken: encryptedAccessToken,
    });

    await this.signedAccountService.updateExpiryDate({
      id: signedAccount.id,
    });

    return account;
  }

  /** 중복되지 않은 랜덤 닉네임 리턴 */
  async getRandomNickname({ entityManager }: Partial<EntityManagerDto> = {}): Promise<string> {
    let nickname = createRandomNickname();

    while (true) {
      const duplicatedAccount = await this.findByNickname({
        nickname,
        entityManager,
      });

      if (duplicatedAccount) {
        nickname = createRandomNickname();
      } else {
        break;
      }
    }

    return nickname;
  }

  /**
   * Convert `Account` to `AccountDto`.
   * @param account - `Account` to convert.
   */
  async toAccountDto(account: Account): Promise<AccountDto> {
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
  async toProfileDto(account: Account, accessToken: string): Promise<ProfileDto> {
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
  async toDeletedAccountDto(account: Account): Promise<DeletedAccountDto> {
    return new DeletedAccountDto({
      ...(await this.toAccountDto(account)),
      email: account.email,
      oauthProvider: account.oauthProvider,
      oauthId: account.oauthId,
    });
  }
}

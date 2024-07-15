import { Injectable, Logger } from '@nestjs/common';
import { AccountService } from '../account/account.service';
import { ProfileDto } from '../../dtos/profile-dto';
import { UpdateAccountDto } from '../../dtos/update-account-dto';
import { AuthApiService } from '../auth-api/auth-api.service';
import { EntityManager } from 'typeorm';

@Injectable()
export class MeApiService {
  private readonly _logger = new Logger('MeApiService');

  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _accountService: AccountService,
    private readonly _authApiService: AuthApiService,
  ) {}

  /**
   * Get account profile of signed user.
   * @param requestUUID
   * @param accessToken
   * @throws SIGN_REQUIED
   * @throws ACCOUNT_NOT_FOUND
   */
  async getAccountProfile(requestUUID: string, accessToken: string): Promise<ProfileDto> {
    const account = await this._accountService.getAccountByAccessToken(accessToken);

    this._logger.log(`[${requestUUID}] Account profile found`);

    return this._accountService.toProfileDto(account, accessToken);
  }

  /**
   * Update nickname and avatarId of signed account.
   * @param requestUUID
   * @param accessToken
   * @param nickname
   * @param avatarId
   * @throws SIGN_REQUIED
   * @throws ACCOUNT_NOT_FOUND
   */
  async updateAccountProfile(
    requestUUID: string,
    accessToken: string,
    { nickname, avatarId }: UpdateAccountDto,
  ): Promise<ProfileDto> {
    const account = await this._accountService.getAccountByAccessToken(accessToken);

    this._logger.log(`[${requestUUID}] Account profile found`);

    if (nickname !== account.nickname) {
      this._logger.log(`[${requestUUID}] Nickname is changed from ${account.nickname} to ${nickname}`);

      await this._authApiService.checkNicknameDuplicated(requestUUID, nickname);
    } else {
      this._logger.log(`[${requestUUID}] Nickname is not changed`);
    }

    await this._entityManager
      .transaction(async (_entityManager) => {
        await this._accountService.updateAccountNickname(account, nickname, _entityManager);

        this._logger.log(`[${requestUUID}] Nickname is updated`);

        await this._accountService.updateAccountAvatarId(account, avatarId || null, _entityManager);

        this._logger.log(`[${requestUUID}] Avatar id is updated`);
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while updating account profile: ${e.toString()}`, e.stack);

        throw e;
      });

    const updatedAccount = await this._accountService.getAccountById(account.id);

    this._logger.log(`[${requestUUID}] Updated account is found`);

    return this._accountService.toProfileDto(updatedAccount, accessToken);
  }
}

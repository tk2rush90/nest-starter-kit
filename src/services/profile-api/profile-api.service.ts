import { Injectable, Logger } from '@nestjs/common';
import { AccountService } from '../account/account.service';
import { ProfileDto } from '../../dtos/profile-dto';
import { UpdateAccountDto } from '../../dtos/update-account-dto';
import { EntityManager } from 'typeorm';

@Injectable()
export class ProfileApiService {
  private readonly _logger = new Logger('ProfileApiService');

  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _accountService: AccountService,
  ) {}

  /** 액세스 토큰을 이용한 프로필 조회 */
  async getOneByAccessToken(accessToken: string): Promise<ProfileDto> {
    const account = await this._accountService.getOneByAccessToken(accessToken);

    return this._accountService.toProfileDto(account, accessToken);
  }

  /** 프로필 업데이트 */
  async update(accessToken: string, body: UpdateAccountDto): Promise<ProfileDto> {
    const account = await this._accountService.getOneByAccessToken(accessToken);

    if (body.nickname !== account.nickname) {
      await this._accountService.checkDuplicated({ nickname: body.nickname });
    }

    const updatedAccount = await this._entityManager.transaction(async (entityManager) => {
      await this._accountService.updateNickname({
        id: account.id,
        nickname: body.nickname,
        entityManager,
      });

      return await this._accountService.updateAvatarUrl({
        id: account.id,
        avatarUrl: body.avatarUrl || null,
        entityManager,
      });
    });

    return this._accountService.toProfileDto(updatedAccount, accessToken);
  }
}

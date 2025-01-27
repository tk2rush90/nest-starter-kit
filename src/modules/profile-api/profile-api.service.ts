import { Injectable } from '@nestjs/common';
import { AccountService } from '../../shared/account/account.service';
import { ProfileDto } from '../../dtos/profile-dto';
import { UpdateAccountDto } from '../../dtos/update-account-dto';
import { EntityManager } from 'typeorm';

@Injectable()
export class ProfileApiService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly accountService: AccountService,
  ) {}

  /** 액세스 토큰을 이용한 프로필 조회 */
  async getOneByAccessToken(accessToken: string): Promise<ProfileDto> {
    const account = await this.accountService.getOneByAccessToken(accessToken);

    return this.accountService.toProfileDto(account, accessToken);
  }

  /** 프로필 업데이트 */
  async update(accessToken: string, body: UpdateAccountDto): Promise<ProfileDto> {
    const account = await this.accountService.getOneByAccessToken(accessToken);

    if (body.nickname !== account.nickname) {
      await this.accountService.checkDuplicated({ nickname: body.nickname });
    }

    const updatedAccount = await this.entityManager.transaction(async (entityManager) => {
      await this.accountService.updateNickname({
        id: account.id,
        nickname: body.nickname,
        entityManager,
      });

      return await this.accountService.updateAvatarUrl({
        id: account.id,
        avatarUrl: body.avatarUrl || null,
        entityManager,
      });
    });

    return this.accountService.toProfileDto(updatedAccount, accessToken);
  }
}

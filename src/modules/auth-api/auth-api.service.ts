import { BadRequestException, Injectable } from '@nestjs/common';
import { INVALID_TOKEN_PAYLOAD, NOT_VERIFIED_GOOGLE_ACCOUNT } from '../../constants/errors';
import { encrypt } from '../../utils/crypto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AccountService } from '../../shared/account/account.service';
import { SignedAccountService } from '../../shared/signed-account/signed-account.service';
import { EntityManager } from 'typeorm';
import { MailService } from '../../shared/mail/mail.service';
import { OauthService } from '../../shared/oauth/oauth.service';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { AccessTokenDto } from '../../dtos/access-token-dto';
import { StartByKakaoDto } from '../../dtos/start-by-kakao-dto';
import { EmailDto } from '../../dtos/email-dto';
import { NicknameDto } from '../../dtos/nickname-dto';

@Injectable()
export class AuthApiService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly mailService: MailService,
    private readonly oauthService: OauthService,
    private readonly accountService: AccountService,
    private readonly signedAccountService: SignedAccountService,
  ) {}

  /** 이메일 중복 체크 */
  async checkEmailDuplicated(query: EmailDto): Promise<void> {
    await this.accountService.checkDuplicated(query);
  }

  /** 닉네임 중복 체크 */
  async checkNicknameDuplicated(query: NicknameDto): Promise<void> {
    await this.accountService.checkDuplicated(query);
  }

  /**
   * 구글 계정으로 시작하기
   * 기존 계정이 있을 경우 로그인, 없을 경우 새 계정 생성
   */
  async startByGoogle(body: AccessTokenDto): Promise<ProfileDto> {
    const tokenPayload = await this.oauthService.verifyGoogleAccessToken(body.accessToken);

    if (!tokenPayload.email_verified) {
      throw new BadRequestException(NOT_VERIFIED_GOOGLE_ACCOUNT);
    }

    if (!tokenPayload.name || !tokenPayload.email) {
      throw new BadRequestException(INVALID_TOKEN_PAYLOAD);
    }

    let account = await this.accountService.findOneByOauth({
      oauthProvider: 'google',
      oauthId: tokenPayload.sub,
    });

    // when account not found, create new one
    if (!account) {
      account = await this.accountService.create({
        email: tokenPayload.email,
        nickname: await this.accountService.getRandomNickname(),
        oauthProvider: 'google',
        oauthId: tokenPayload.sub,
        avatarUrl: tokenPayload.picture,
      });
    }

    const signedAccessToken = await this.signedAccountService.markAccountAsSigned({
      accountId: account.id,
      email: account.email,
      salt: account.salt,
    });

    return this.accountService.toProfileDto(account, signedAccessToken);
  }

  /**
   * 카카오 계정으로 시작하기
   * 기존 계정이 있을 경우 로그인, 없을 경우 새 계정 생성
   */
  async startByKakao(body: StartByKakaoDto): Promise<ProfileDto> {
    const response = await this.oauthService.getKakaoAccessToken(body.code, body.redirectUri);

    const tokenPayload = await this.oauthService.decodeKakaoIdToken(response.id_token);

    let account = await this.accountService.findOneByOauth({ oauthProvider: 'kakao', oauthId: tokenPayload.sub });

    // when account not found, create new one
    if (!account) {
      account = await this.accountService.create({
        email: tokenPayload.email,
        nickname: await this.accountService.getRandomNickname(),
        oauthProvider: 'kakao',
        oauthId: tokenPayload.sub,
        avatarUrl: tokenPayload.picture,
      });
    }

    const signedAccessToken = await this.signedAccountService.markAccountAsSigned({
      accountId: account.id,
      email: account.email,
      salt: account.salt,
    });

    return this.accountService.toProfileDto(account, signedAccessToken);
  }

  /** 토근을 이용한 자동 로그인 시도 */
  async autoLogin(accessToken: string): Promise<ProfileDto | void> {
    // Validate and get account.
    const account = await this.accountService.validateAccessToken(accessToken);

    // Convert and return.
    return this.accountService.toProfileDto(account, accessToken);
  }

  /** 로그아웃 처리 */
  async logout(accessToken: string): Promise<void> {
    const account = await this.accountService.validateAccessToken(accessToken);

    const encryptedAccessToken = encrypt(accessToken, account.salt);

    const signedAccount = await this.signedAccountService.getOneByUnique({
      accountId: account.id,
      accessToken: encryptedAccessToken,
    });

    await this.signedAccountService.delete({
      id: signedAccount.id,
    });
  }

  /** 계정 삭제 */
  async deleteAccount(accessToken: string): Promise<DeletedAccountDto> {
    const account = await this.accountService.validateAccessToken(accessToken);

    const deletedAccount = await this.accountService.toDeletedAccountDto(account);

    await this.entityManager.transaction(async (entityManager) => {
      await this.accountService.delete({
        id: account.id,
        entityManager,
      });

      await this.mailService.sendMail(deletedAccount.email, '계정이 삭제 되었습니다', 'delete-account.html', {
        nickname: deletedAccount.nickname,
      });
    });

    return deletedAccount;
  }
}

import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  DUPLICATED_EMAIL,
  DUPLICATED_NICKNAME,
  INVALID_TOKEN_PAYLOAD,
  NOT_VERIFIED_GOOGLE_ACCOUNT,
  SIGN_REQUIRED,
} from '../../constants/errors';
import { createSalt, encrypt } from '../../utils/crypto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AccountService } from '../account/account.service';
import { SignedAccountService } from '../signed-account/signed-account.service';
import { EntityManager } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { OauthService } from '../oauth/oauth.service';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { AccessTokenDto } from '../../dtos/access-token-dto';
import { CodeDto } from '../../dtos/code-dto';

@Injectable()
export class AuthApiService {
  private readonly _logger = new Logger('AuthApiService');

  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _mailService: MailService,
    private readonly _oauthService: OauthService,
    private readonly _accountService: AccountService,
    private readonly _signedAccountService: SignedAccountService,
  ) {}

  /**
   * Check email duplicated.
   * When duplicated, throws DUPLICATED_EMAIL error.
   * @param requestUUID
   * @param email
   * @throws DUPLICATED_EMAIL
   */
  async checkEmailDuplicated(requestUUID: string, email: string): Promise<void> {
    // Check email duplication.
    if (await this._accountService.isEmailDuplicated(email)) {
      this._logger.error(`[${requestUUID}] Email is duplicated: ${email}`);

      throw new ConflictException(DUPLICATED_EMAIL);
    } else {
      this._logger.log(`[${requestUUID}] Email duplication checked: ${email}`);
    }
  }

  /**
   * Check nickname duplicated.
   * When duplicated, throws DUPLICATED_NICKNAME error.
   * @param requestUUID
   * @param nickname
   * @throws DUPLICATED_NICKNAME
   */
  async checkNicknameDuplicated(requestUUID: string, nickname: string): Promise<void> {
    // Check nickname duplication.
    if (await this._accountService.isNicknameDuplicated(nickname)) {
      this._logger.error(`[${requestUUID}] Nickname is duplicated: ${nickname}`);

      throw new ConflictException(DUPLICATED_NICKNAME);
    } else {
      this._logger.log(`[${requestUUID}] Nickname duplication checked: ${nickname}`);
    }
  }

  async startByGoogle({ accessToken }: AccessTokenDto): Promise<ProfileDto> {
    const tokenPayload = await this._oauthService.verifyGoogleAccessToken(accessToken);

    if (!tokenPayload.email_verified) {
      throw new BadRequestException(NOT_VERIFIED_GOOGLE_ACCOUNT);
    }

    if (!tokenPayload.name || !tokenPayload.email) {
      throw new BadRequestException(INVALID_TOKEN_PAYLOAD);
    }

    let account = await this._accountService.findAccountByOauth('google', tokenPayload.sub);

    // when account not found, create new one
    if (!account) {
      let nickname = tokenPayload.name.replace(/\s/gim, '').substring(0, 4) + createSalt().substring(0, 8);

      while (true) {
        const duplicated = await this._accountService.isNicknameDuplicated(nickname);

        if (duplicated) {
          // create nickname until not duplicated
          nickname = tokenPayload.name.replace(/\s/gim, '').substring(0, 4) + createSalt().substring(0, 8);
        } else {
          break;
        }
      }

      account = await this._accountService.createAccount({
        email: tokenPayload.email,
        nickname,
        oauthProvider: 'google',
        oauthId: tokenPayload.sub,
        avatarUrl: tokenPayload.picture,
      });
    }

    const signedAccessToken = await this._signedAccountService.markAccountAsSigned(account);

    return this._accountService.toProfileDto(account, signedAccessToken);
  }

  async startByKakao(body: CodeDto): Promise<ProfileDto> {
    const response = await this._oauthService.getKakaoAccessToken(body.code);

    const tokenPayload = await this._oauthService.decodeKakaoIdToken(response.id_token);

    let account = await this._accountService.findAccountByOauth('kakao', tokenPayload.sub);

    // when account not found, create new one
    if (!account) {
      let nickname = tokenPayload.nickname.replace(/\s/gim, '').substring(0, 4) + createSalt().substring(0, 8);

      while (true) {
        const duplicated = await this._accountService.isNicknameDuplicated(nickname);

        if (duplicated) {
          // create nickname until not duplicated
          nickname = tokenPayload.nickname.replace(/\s/gim, '').substring(0, 4) + createSalt().substring(0, 8);
        } else {
          break;
        }
      }

      account = await this._accountService.createAccount({
        email: tokenPayload.email,
        nickname,
        oauthProvider: 'kakao',
        oauthId: tokenPayload.sub,
        avatarUrl: tokenPayload.picture,
      });
    }

    const signedAccessToken = await this._signedAccountService.markAccountAsSigned(account);

    return this._accountService.toProfileDto(account, signedAccessToken);
  }

  /**
   * Auto login process with token.
   * @param requestUUID
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  async autoLogin(requestUUID: string, accessToken: string): Promise<ProfileDto | void> {
    if (accessToken) {
      // Validate and get account.
      const account = await this._accountService.validateAccessToken(accessToken);

      this._logger.log(`[${requestUUID}] Access token is validated: ${account.id}`);

      // Convert and return.
      return this._accountService.toProfileDto(account, accessToken);
    } else {
      this._logger.error(`[${requestUUID}] Access token isn't provided`);

      throw new UnauthorizedException(SIGN_REQUIRED);
    }
  }

  /**
   * Logout.
   * @param requestUUID
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  async logout(requestUUID: string, accessToken: string): Promise<void> {
    try {
      const account = await this._accountService.validateAccessToken(accessToken);

      this._logger.log(`[${requestUUID}] Access token is validated: ${account.id}`);

      const encryptedAccessToken = encrypt(accessToken, account.salt);

      this._logger.log(`[${requestUUID}] Access token is encrypted`);

      const signedAccount = await this._signedAccountService.getSignedAccount(account, encryptedAccessToken);

      this._logger.log(`[${requestUUID}] Signed account found`);

      await this._signedAccountService.deleteSignedAccount(signedAccount);

      this._logger.log(`[${requestUUID}] Signed account deleted`);
    } catch (e) {
      // Don't throw exception to process logout from the client.
      this._logger.error(`[${requestUUID}] Error while logging out: ${e.toString()}`, e.stack);
    }
  }

  /**
   * Delete account.
   * @param requestUUID
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  async deleteAccount(requestUUID: string, accessToken: string): Promise<DeletedAccountDto> {
    const account = await this._accountService.validateAccessToken(accessToken);

    this._logger.log(`[${requestUUID}] Access token is validated: ${account.id}`);

    const deletedAccount = this._accountService.toDeletedAccountDto(account);

    await this._entityManager
      .transaction(async (_entityManager) => {
        await this._accountService.deleteAccount(account, _entityManager);

        this._logger.log(`[${requestUUID}] Account is deleted: ${deletedAccount.id}`);

        await this._mailService.sendMail(deletedAccount.email, '계정이 삭제 되었습니다', 'delete-account.html', {
          nickname: deletedAccount.nickname,
        });
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while deleting account: ${e.toString()}`, e.stack);

        throw e;
      });

    return deletedAccount;
  }
}

import { OauthProvider } from '../types/oauth-provider';

export class AccountJsonDto {
  id: string;
  salt: string;
  email: string;
  nickname: string;
  otp: string | null;
  otpExpiredAt: Date | string | null;
  avatarId: string | null;
  oauthProvider: OauthProvider | null;
  oauthId: string | null;
  accountExpiredAt: Date | string | null;
  createdAt: Date | string;

  constructor(dto?: AccountJsonDto) {
    Object.assign(this, dto);
  }
}

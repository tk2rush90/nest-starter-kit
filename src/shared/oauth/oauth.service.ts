import { Injectable } from '@nestjs/common';
import { configs } from '../../configs/configs';
import { TokenPayload } from 'google-auth-library/build/src/auth/loginticket';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { KakaoTokenResponse } from '../../dtos/kakao-token-response';
import { KakaoIdTokenPayload } from '../../dtos/kakao-id-token-payload';
import { decodeToken } from '../../utils/jwt';

@Injectable()
export class OauthService {
  constructor(private readonly httpService: HttpService) {}

  async verifyGoogleAccessToken(accessToken: string): Promise<TokenPayload> {
    const response = await lastValueFrom(
      this.httpService.get<TokenPayload>(configs.oauth.google.userinfoUrl, {
        params: {
          access_token: accessToken,
        },
      }),
    );

    return response.data;
  }

  async getKakaoAccessToken(code: string, redirectUri: string): Promise<KakaoTokenResponse> {
    const response = await lastValueFrom(
      this.httpService.post<KakaoTokenResponse>(configs.oauth.kakao.tokenUrl, {
        grant_type: 'authorization_code',
        client_id: configs.oauth.kakao.clientId,
        client_secret: configs.oauth.kakao.clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    );

    return response.data;
  }

  async decodeKakaoIdToken(idToken: string): Promise<KakaoIdTokenPayload> {
    return decodeToken(idToken);
  }
}

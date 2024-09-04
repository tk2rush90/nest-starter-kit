import { Injectable } from '@nestjs/common';
import { configs } from '../../configs/configs';
import { TokenPayload } from 'google-auth-library/build/src/auth/loginticket';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OauthService {
  constructor(private readonly _httpService: HttpService) {}

  async verifyGoogleAccessToken(accessToken: string): Promise<TokenPayload> {
    const response = await lastValueFrom(
      this._httpService.get<TokenPayload>(configs.oauth.google.userinfoUrl, {
        params: {
          access_token: accessToken,
        },
      }),
    );

    return response.data;
  }
}

import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { configs } from '../../configs/configs';
import { TokenPayload } from 'google-auth-library/build/src/auth/loginticket';

@Injectable()
export class OauthService {
  /**
   * Verify google id token.
   * @param idToken
   */
  async verifyGoogleIdToken(idToken: string): Promise<TokenPayload | undefined> {
    const client = new google.auth.OAuth2(
      configs.oauth.google.clientId,
      configs.oauth.google.clientSecret,
      configs.oauth.google.redirectUrl,
    );

    const loginTicket = await client.verifyIdToken({
      idToken,
    });

    return loginTicket.getPayload();
  }
}

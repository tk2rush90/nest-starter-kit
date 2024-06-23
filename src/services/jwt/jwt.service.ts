import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { configs } from '../../configs/configs';

/** A service that contains features for jsonwebtoken */
@Injectable()
export class JwtService {
  private readonly _logger = new Logger('JwtService');

  /**
   * Sign new token for `Account` with payload.
   * To handle exception easier, use Promise.
   * @param payload - `PayloadDto`.
   * @returns Returns created token.
   */
  async sign(payload: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const token = sign(payload.toPlainObject(), configs.jwt.secret, {
          algorithm: 'HS512',
          issuer: configs.jwt.issuer,
        });

        resolve(token);
      } catch (e) {
        this._logger.error('Failed to sign token: ' + e.toString(), e.stack);

        reject(e);
      }
    });
  }

  /**
   * Verify token to get `PayloadDto`.
   * To handle exception easier, use Promise.
   * @param token - Token to verify.
   * @returns Returns verified payload.
   */
  async verify<T>(token: string): Promise<T & JwtPayload> {
    return new Promise<T & JwtPayload>((resolve, reject) => {
      try {
        const payload = verify(token, configs.jwt.secret, {
          algorithms: ['HS512'],
          issuer: configs.jwt.issuer,
        }) as T & JwtPayload;

        resolve(payload);
      } catch (e) {
        this._logger.error('Failed to sign token: ' + e.toString(), e.stack);

        reject(e);
      }
    });
  }
}

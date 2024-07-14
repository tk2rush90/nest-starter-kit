import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { configs } from '../configs/configs';

/**
 * Verify a Jsonwebtoken.
 * @param token
 */
export async function verifyToken<T>(token: string): Promise<T & JwtPayload> {
  return new Promise<T & JwtPayload>((resolve, reject) => {
    try {
      const payload = verify(token, configs.jwt.secret, {
        algorithms: ['HS512'],
        issuer: configs.jwt.issuer,
      }) as T & JwtPayload;

      resolve(payload);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Sign new jsonwebtoken.
 * @param payload
 */
export async function signToken(payload: any): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const token = sign(payload, configs.jwt.secret, {
        algorithm: 'HS512',
        issuer: configs.jwt.issuer,
      });

      resolve(token);
    } catch (e) {
      reject(e);
    }
  });
}

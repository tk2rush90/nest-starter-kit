import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { IsNullable } from '../decorators/is-nullable';

/** A DTO for account that contains non-sensitive data */
export class AccountDto {
  /** Account id */
  @IsString()
  @IsNotEmpty()
  id: string;

  /** Account email */
  @IsString()
  @IsNotEmpty()
  email: string;

  /** Account nickname */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  /** Expiry date of account first sign in */
  @IsDate()
  @IsNullable()
  expiredAt: Date | null;

  constructor(dto?: AccountDto) {
    Object.assign(this, dto);
  }
}

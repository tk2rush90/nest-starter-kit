import { IsNotEmpty, IsString } from 'class-validator';

/** A DTO for account that contains non-sensitive data */
export class AccountDto {
  /** Account id */
  @IsString()
  @IsNotEmpty()
  id: string;

  /** Account nickname */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  constructor(dto?: AccountDto) {
    Object.assign(this, dto);
  }
}

/** A DTO for account that contains non-sensitive data */
export class AccountDto {
  /** Account id */
  id: string;

  /** Account nickname */
  nickname: string;

  constructor(dto?: AccountDto) {
    Object.assign(this, dto);
  }
}

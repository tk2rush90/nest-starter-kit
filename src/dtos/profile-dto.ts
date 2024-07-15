/** A DTO for account profile */
export class ProfileDto {
  /** Account id */
  id: string;

  /** Avatar id */
  avatarId: string | null;

  /** Account nickname */
  nickname: string;

  /** Access token */
  accessToken: string;

  constructor(dto?: ProfileDto) {
    Object.assign(this, dto);
  }
}

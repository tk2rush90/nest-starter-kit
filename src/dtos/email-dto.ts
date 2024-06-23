import { IsNotEmpty, IsString } from 'class-validator';

/** A DTO that contains required `email` property */
export class EmailDto {
  /** Email that is required */
  @IsString()
  @IsNotEmpty()
  email: string;
}

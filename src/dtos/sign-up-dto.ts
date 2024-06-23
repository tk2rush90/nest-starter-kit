import { IsEmail, IsNotEmpty } from 'class-validator';
import { NicknameDto } from './nickname-dto';

/** Request DTO to sign up for new account */
export class SignUpDto extends NicknameDto {
  /** Email to use as an account */
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

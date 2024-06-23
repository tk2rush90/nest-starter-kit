import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** Request DTO to sign in */
export class SignInDto {
  /** Email to sign in */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** OTP password */
  @IsString()
  @IsNotEmpty()
  otp: string;
}

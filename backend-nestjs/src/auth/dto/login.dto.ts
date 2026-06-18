import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Matches(/^[a-z0-9-]{3,30}$/, {
    message:
      'Subdomain must be lowercase alphanumeric with hyphens, 3-30 chars',
  })
  subdomain: string;
}

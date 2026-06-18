import {
  IsString,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @Matches(/^[a-z0-9-]{3,30}$/, {
    message:
      'Subdomain must be lowercase alphanumeric with hyphens, 3-30 chars',
  })
  subdomain: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  commercialName: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Primary color must be a hex color code (e.g. #RRGGBB)',
  })
  primaryColor?: string;
}

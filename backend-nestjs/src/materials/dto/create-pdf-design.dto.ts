import { IsString, IsOptional, IsBoolean, MaxLength, Matches } from 'class-validator';

export class CreatePdfDesignDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontFamily?: string;

  @IsOptional()
  @IsString()
  headerText?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  showCover?: boolean;

  @IsOptional()
  @IsString()
  backgroundUrl?: string;

  @IsOptional()
  @IsBoolean()
  showPagination?: boolean;

  @IsOptional()
  @IsBoolean()
  showFrame?: boolean;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

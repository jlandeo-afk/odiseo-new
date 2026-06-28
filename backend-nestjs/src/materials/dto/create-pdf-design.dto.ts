import { IsString, IsOptional, IsBoolean, MaxLength, Matches, IsObject } from 'class-validator';

export class CreatePdfDesignDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @IsOptional()
  @IsString()
  watermarkImageUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  showCover?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3},\s?\d{1,3},\s?\d{1,3}$/, {
    message: 'primaryTitleColor must be a valid RGB triplet (e.g. "2, 113, 184")',
  })
  primaryTitleColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3},\s?\d{1,3},\s?\d{1,3}$/, {
    message: 'secondaryTitleColor must be a valid RGB triplet (e.g. "2, 113, 184")',
  })
  secondaryTitleColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3},\s?\d{1,3},\s?\d{1,3}$/, {
    message: 'backgroundHighlightColor must be a valid RGB triplet (e.g. "214, 238, 253")',
  })
  backgroundHighlightColor?: string;

  @IsOptional()
  @IsString()
  marginTop?: string;

  @IsOptional()
  @IsString()
  marginBottom?: string;

  @IsOptional()
  @IsString()
  marginInside?: string;

  @IsOptional()
  @IsString()
  marginOutside?: string;

  @IsOptional()
  @IsBoolean()
  isBookMode?: boolean;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  contentFontSize?: string;

  @IsOptional()
  @IsString()
  contentTextColor?: string;

  @IsOptional()
  @IsString()
  borderRadius?: string;

  @IsOptional()
  blocksConfig?: any;

  @IsOptional()
  @IsObject()
  headerConfig?: any;

  @IsOptional()
  @IsObject()
  footerConfig?: any;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

import { IsUUID, IsInt, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class GenerateMaterialDto {
  @IsUUID()
  profileId: string;

  @IsInt()
  weekNumber: number;

  @IsBoolean()
  requiresReview: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  examAreas?: string[];
}

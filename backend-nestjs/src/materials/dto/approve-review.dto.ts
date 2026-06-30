import {
  IsInt,
  IsBoolean,
  IsArray,
  IsUUID,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReplacementItemDto {
  @IsUUID()
  reviewQuestionId: string;

  @IsString()
  questionId: string;
}

export class ApproveReviewDto {
  @IsInt()
  version: number;

  @IsBoolean()
  continueWithWarnings: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplacementItemDto)
  replacements: ReplacementItemDto[];

  @IsArray()
  @IsUUID('all', { each: true })
  removals: string[];
}

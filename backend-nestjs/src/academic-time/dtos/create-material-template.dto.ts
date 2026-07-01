import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateScope {
  CURRENT_WEEK = 'CURRENT_WEEK',
  ACCUMULATIVE = 'ACCUMULATIVE',
  FULL_ACCUMULATIVE = 'FULL_ACCUMULATIVE',
}

export class CreateTemplateCourseDto {
  // Cambiamos IsUUID por IsString para soportar los UUID falsos del seed (ej. 0000000000c1)
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  questionsQuantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  easyCount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mediumCount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hardCount?: number;
}

export class CreateCycleMaterialTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TemplateScope)
  @IsNotEmpty()
  scope: TemplateScope;

  @IsNumber()
  @Min(1)
  @IsOptional()
  accumulationWeeks?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateCourseDto)
  courses: CreateTemplateCourseDto[];
}

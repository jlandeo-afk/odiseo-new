import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TemplateScope,
  CreateTemplateCourseDto,
} from './create-material-template.dto';

export class UpdateCycleMaterialTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TemplateScope)
  @IsOptional()
  scope?: TemplateScope;

  @IsNumber()
  @Min(1)
  @IsOptional()
  accumulationWeeks?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateCourseDto)
  @IsOptional()
  courses?: CreateTemplateCourseDto[];
}

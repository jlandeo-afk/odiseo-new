import { IsString, IsNotEmpty, IsNumber, Min, IsDateString, Max, IsOptional } from 'class-validator';

export class UpdateCycleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  startDate?: string;

  @IsNumber()
  @Min(1)
  @Max(7)
  @IsOptional()
  daysPerWeek?: number;

  @IsNumber()
  @Min(1)
  @Max(52)
  @IsOptional()
  totalWeeks?: number;
}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  Max,
} from 'class-validator';

export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsNumber()
  @Min(1)
  @Max(7)
  daysPerWeek: number;

  @IsNumber()
  @Min(1)
  @Max(52)
  totalWeeks: number;
}

import { IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class UpdateDistributionDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsNotEmpty()
  questionCount: number;
}

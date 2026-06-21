import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreateDistributionDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  weekNumber: number;

  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsNotEmpty()
  subtopicId: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  weight: number;
}

import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSyllabusDto {
  @IsString()
  @IsNotEmpty()
  cycleId: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;
}

export class GenerateMaterialRequestDto {
  material_type: 'BALOTARIO' | 'EXAMEN' | 'PRACTICA';
  course_id: string;
  difficulty_level: string;
  exam_areas?: string[];
}

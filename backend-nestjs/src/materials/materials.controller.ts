import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { GenerateMaterialRequestDto } from './dto/generate-material-request.dto';
import { MaterialsService } from './materials.service';

@Controller('v1/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted
  async generateMaterial(@Body() request: GenerateMaterialRequestDto) {
    if (request.material_type === 'EXAMEN' && (!request.exam_areas || request.exam_areas.length === 0)) {
      throw new BadRequestException('exam_areas is required when material_type is EXAMEN');
    }

    const jobId = await this.materialsService.generateMaterial(request);

    return {
      status: 'processing',
      job_id: jobId,
      message: 'La solicitud ha sido encolada exitosamente. Recibirás una notificación cuando el material esté listo para descargar.',
    };
  }
}

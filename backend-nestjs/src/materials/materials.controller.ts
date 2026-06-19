import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GenerateMaterialRequestDto } from './dto/generate-material-request.dto';
import { WebhookStatusRequestDto } from './dto/webhook-status-request.dto';
import { MaterialsService } from './materials.service';

@ApiTags('Materials')
@Controller('v1/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted
  @ApiOperation({
    summary: 'Solicitar generación asíncrona de balotario/examen',
  })
  @ApiResponse({
    status: 202,
    description: 'La solicitud ha sido encolada exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Error de validación de negocio.' })
  async generateMaterial(@Body() request: GenerateMaterialRequestDto) {
    const jobId = await this.materialsService.generateMaterial(request);

    return {
      status: 'processing',
      job_id: jobId,
      message:
        'La solicitud ha sido encolada exitosamente. Recibirás una notificación cuando el material esté listo para descargar.',
    };
  }

  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook interno para actualización de estado desde el Worker',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado correctamente.',
  })
  async updateMaterialStatus(@Body() request: WebhookStatusRequestDto) {
    await this.materialsService.updateMaterialStatus(request);
    return { success: true };
  }
}

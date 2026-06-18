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

  @Put(':jobId/questions/:questionId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover una pregunta específica durante la curaduría manual',
  })
  @ApiParam({
    name: 'jobId',
    type: 'string',
    description: 'ID del job de generación',
  })
  @ApiParam({
    name: 'questionId',
    type: 'string',
    description: 'ID de la pregunta a remover',
  })
  @ApiResponse({
    status: 200,
    description: 'Pregunta removida de forma atómica.',
  })
  async removeQuestion(
    @Param('jobId') jobId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.materialsService.removeQuestion(jobId, questionId);
    return { success: true, message: 'Question removed successfully' };
  }

  @Put(':jobId/questions/:questionId/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerar una pregunta específica durante la curaduría manual',
  })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiParam({ name: 'questionId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Nueva pregunta generada devuelta.',
  })
  async regenerateQuestion(
    @Param('jobId') jobId: string,
    @Param('questionId') questionId: string,
  ) {
    const newQuestion = await this.materialsService.regenerateQuestion(
      jobId,
      questionId,
    );
    return { success: true, question: newQuestion };
  }

  @Put(':jobId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar la curaduría manual y reanudar generación física',
  })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Job marcado como listo para PDF.' })
  async manualComplete(@Param('jobId') jobId: string) {
    await this.materialsService.manualComplete(jobId);
    return { success: true, message: 'Manual curation completed' };
  }

  @Put(':jobId/autocomplete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ejecutar autocompletado en curaduría' })
  @ApiParam({ name: 'jobId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Preguntas completadas automáticamente.',
  })
  async autoComplete(@Param('jobId') jobId: string) {
    await this.materialsService.autoComplete(jobId);
    return { success: true, message: 'Auto curation completed' };
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GenerateMaterialDto } from './dto/generate-material.dto';
import { WebhookStatusRequestDto } from './dto/webhook-status-request.dto';
import { ApproveReviewDto } from './dto/approve-review.dto';
import { MaterialsService } from './materials.service';
import { GenerateMaterialUseCase } from './use-cases/generate-material.use-case';

@ApiTags('Materials')
@Controller('v1/materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly generateMaterialUseCase: GenerateMaterialUseCase,
  ) {}

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
  async generateMaterial(@Body() request: GenerateMaterialDto) {
    // Simulamos un userId y tenantId por ahora ya que no hay auth integrado
    const tenantId = '7b89-11c2-d344';
    const userId = 'uuid_admin_user';
    return await this.generateMaterialUseCase.execute(tenantId, userId, request);
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

  @Get(':id/review')
  @ApiOperation({
    summary: 'Obtener reactivos y slots de revisión para curaduría',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de preguntas cargadas para revisión.',
  })
  @ApiResponse({ status: 404, description: 'La solicitud no existe.' })
  async getReviewData(@Param('id') id: string) {
    return await this.materialsService.getReviewData(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Aprobar curaduría y gatillar compilación física asíncrona',
  })
  @ApiResponse({
    status: 202,
    description: 'Revisión guardada y compilación iniciada.',
  })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia.' })
  async approveCuration(
    @Param('id') id: string,
    @Body() request: ApproveReviewDto,
  ) {
    return await this.materialsService.approveCuration(id, request);
  }

  @Get(':id/courses/:courseId/download')
  @ApiOperation({
    summary: 'Obtener URL firmada dinámica de descarga de S3 para un curso',
  })
  @ApiResponse({
    status: 200,
    description: 'Enlace dinámico de descarga devuelto.',
  })
  @ApiResponse({ status: 404, description: 'La solicitud o el curso no existen.' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
  ) {
    return await this.materialsService.getDownloadUrl(id, courseId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Obtener historial de solicitudes de generación',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de generación devuelto.',
  })
  async getHistory(
    @Query('cycleId') cycleId?: string,
    @Query('cycleIds') cycleIds?: string,
    @Query('weekNumbers') weekNumbers?: string,
    @Query('templateIds') templateIds?: string,
  ) {
    const idsToFilter = cycleIds ? cycleIds.split(',') : (cycleId ? [cycleId] : undefined);
    const parsedWeeks = weekNumbers ? weekNumbers.split(',').map(w => parseInt(w, 10)).filter(w => !isNaN(w)) : undefined;
    const parsedTemplates = templateIds ? templateIds.split(',') : undefined;
    return await this.materialsService.getHistory(idsToFilter, parsedWeeks, parsedTemplates);
  }
}

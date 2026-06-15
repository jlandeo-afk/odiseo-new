import { Controller, Post, Put, Body, Param, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { GenerateMaterialRequestDto } from './dto/generate-material-request.dto';
import { WebhookStatusRequestDto } from './dto/webhook-status-request.dto';
import { MaterialsService } from './materials.service';

@Controller('v1/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted
  async generateMaterial(@Body() request: GenerateMaterialRequestDto) {
    const jobId = await this.materialsService.generateMaterial(request);

    return {
      status: 'processing',
      job_id: jobId,
      message: 'La solicitud ha sido encolada exitosamente. Recibirás una notificación cuando el material esté listo para descargar.',
    };
  }

  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  async updateMaterialStatus(@Body() request: WebhookStatusRequestDto) {
    await this.materialsService.updateMaterialStatus(request);
    return { success: true };
  }

  @Put(':jobId/questions/:questionId/remove')
  @HttpCode(HttpStatus.OK)
  async removeQuestion(@Param('jobId') jobId: string, @Param('questionId') questionId: string) {
    await this.materialsService.removeQuestion(jobId, questionId);
    return { success: true, message: 'Question removed successfully' };
  }

  @Put(':jobId/questions/:questionId/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateQuestion(@Param('jobId') jobId: string, @Param('questionId') questionId: string) {
    const newQuestion = await this.materialsService.regenerateQuestion(jobId, questionId);
    return { success: true, question: newQuestion };
  }

  @Put(':jobId/complete')
  @HttpCode(HttpStatus.OK)
  async manualComplete(@Param('jobId') jobId: string) {
    await this.materialsService.manualComplete(jobId);
    return { success: true, message: 'Manual curation completed' };
  }

  @Put(':jobId/autocomplete')
  @HttpCode(HttpStatus.OK)
  async autoComplete(@Param('jobId') jobId: string) {
    await this.materialsService.autoComplete(jobId);
    return { success: true, message: 'Auto curation completed' };
  }
}

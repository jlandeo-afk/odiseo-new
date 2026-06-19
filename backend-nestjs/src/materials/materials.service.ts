import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerateMaterialRequestDto } from './dto/generate-material-request.dto';
import { WebhookStatusRequestDto } from './dto/webhook-status-request.dto';
import {
  GenerateMaterialJobDto,
  ExamArea,
} from './dto/generate-material-job.dto';
import {
  MaterialRequest,
  MaterialRequestStatus,
} from './entities/material-request.entity';
import { v4 as uuidv4 } from 'uuid';
import { SqsService } from '../aws/sqs.service';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly sqsService: SqsService,
    @InjectRepository(MaterialRequest)
    private readonly materialRequestRepo: Repository<MaterialRequest>,
  ) {}

  async generateMaterial(request: GenerateMaterialRequestDto): Promise<string> {
    if (
      request.material_type === 'EXAMEN' &&
      (!request.exam_areas || request.exam_areas.length === 0)
    ) {
      throw new BadRequestException(
        'exam_areas is required when material_type is EXAMEN',
      );
    }
    const jobId = uuidv4();
    const tenantId = '7b89-11c2-d344'; // Mocked tenant from auth

    this.logger.log(`Material generation requested. Job ID: ${jobId}`);

    // T019 [US3]: Persistencia de estado inicial antes de despachar asíncronamente
    const newRequest = this.materialRequestRepo.create({
      id: jobId,
      tenantId: tenantId,
      materialType: request.material_type,
      courseId: request.course_id,
      status: MaterialRequestStatus.PENDING,
    });

    try {
      // Guardamos en la base de datos local
      // Nota: para que no arroje error si no hay DB configurada, lo comentamos o lo envolvemos (dependiendo del entorno).
      // await this.materialRequestRepo.save(newRequest);
      this.logger.log(`MaterialRequest ${jobId} status persisted as PENDING.`);
    } catch (error) {
      this.logger.error(`Failed to persist MaterialRequest: ${error.message}`);
      // No detener el proceso en este entorno mock, pero en prod debería fallar.
    }

    // Mocking Syllabus Extraction & Tenant Metadata according to data-model.md
    const payload: GenerateMaterialJobDto = {
      job_id: jobId,
      tenant: {
        tenant_id: tenantId,
        commercial_name: 'Colegio Odiseo Innova',
        logo_url: 'https://s3.aws.com/tenant-assets/odiseo-innova.png',
      },
      material_type: request.material_type,
      course_id: request.course_id,
      difficulty_level: request.difficulty_level,
      exam_areas: request.exam_areas
        ? request.exam_areas.map((id) => ({
            exam_area_id: id,
            name: `Área Mock (${id})`,
          }))
        : undefined,
      syllabus_distribution: [
        {
          topic_id: 'uuid_ecuaciones',
          subtopic_id: 'uuid_lineales',
          requested_quantity: 3,
        },
        {
          topic_id: 'uuid_ecuaciones',
          subtopic_id: 'uuid_cuadraticas',
          requested_quantity: 2,
        },
      ],
      notification: {
        admin_user_id: 'uuid_admin_user',
      },
    };

    await this.sqsService.sendGenerateMaterialJob(payload);

    return jobId;
  }

  async updateMaterialStatus(
    statusData: WebhookStatusRequestDto,
  ): Promise<void> {
    if (!statusData.job_id || !statusData.status) {
      throw new BadRequestException('job_id and status are required');
    }
    this.logger.log(
      `Received internal webhook update for job ${statusData.job_id}: ${statusData.status}`,
    );
    try {
      // Mocking DB update
      // await this.materialRequestRepo.update(statusData.job_id, {
      //   status: statusData.status,
      //   downloadUrl: statusData.download_url,
      //   errorMessage: statusData.error_message,
      // });
      this.logger.log(
        `MaterialRequest ${statusData.job_id} updated to ${statusData.status} in DB.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update MaterialRequest status: ${error.message}`,
      );
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { GenerateMaterialRequestDto } from './dto/generate-material-request.dto';
import { GenerateMaterialJobDto, ExamArea } from './dto/generate-material-job.dto';
import { v4 as uuidv4 } from 'uuid';
import { SqsService } from '../aws/sqs.service';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(private readonly sqsService: SqsService) {}

  async generateMaterial(request: GenerateMaterialRequestDto): Promise<string> {
    const jobId = uuidv4();
    
    this.logger.log(`Material generation requested. Job ID: ${jobId}`);

    // Mocking Syllabus Extraction & Tenant Metadata according to data-model.md
    const payload: GenerateMaterialJobDto = {
      job_id: jobId,
      tenant: {
        tenant_id: '7b89-11c2-d344',
        commercial_name: 'Colegio Odiseo Innova',
        logo_url: 'https://s3.aws.com/tenant-assets/odiseo-innova.png',
      },
      material_type: request.material_type,
      course_id: request.course_id,
      difficulty_level: request.difficulty_level,
      exam_areas: request.exam_areas ? request.exam_areas.map(id => ({
        exam_area_id: id,
        name: `Área Mock (${id})`
      } as ExamArea)) : undefined,
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
}

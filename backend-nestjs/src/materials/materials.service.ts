import { Injectable, Logger } from '@nestjs/common';
import { GenerateMaterialRequestDto } from './dto/generate-material-request.dto';
import { v4 as uuidv4 } from 'uuid'; // we need to install uuid if we use it, but for now we can mock or just return a string
import { SqsService } from '../aws/sqs.service';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(private readonly sqsService: SqsService) {}

  async generateMaterial(request: GenerateMaterialRequestDto): Promise<string> {
    const jobId = 'mock-job-id-' + Date.now(); // or uuid
    
    // Todo (T009): Extract syllabus distribution from DB and send payload to SQS.
    this.logger.log(`Material generation requested. Job ID: ${jobId}`);

    return jobId;
  }
}

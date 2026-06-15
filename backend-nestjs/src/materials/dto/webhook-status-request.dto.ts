import { MaterialRequestStatus } from '../entities/material-request.entity';

export class WebhookStatusRequestDto {
  job_id: string;
  status: MaterialRequestStatus;
  download_url?: string;
  error_message?: string;
}

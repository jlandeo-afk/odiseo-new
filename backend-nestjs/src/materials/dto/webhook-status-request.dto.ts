export class WebhookStatusRequestDto {
  job_id: string;
  status: string;
  download_url?: string;
  error_message?: string;
}

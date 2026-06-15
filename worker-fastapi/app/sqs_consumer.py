import os
import boto3
import json
import logging
import time
import os
import requests
from .material_assembler import material_assembler
from .ws_notifier import ws_notifier
from .core_api_client import InsufficientQuestionsError

logger = logging.getLogger(__name__)

class SQSConsumer:
    def __init__(self):
        self.queue_url = os.getenv("AWS_SQS_QUEUE_URL", "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/odiseo-materials-queue")
        self.b2b_webhook_url = os.getenv("B2B_WEBHOOK_URL", "http://localhost:3000/v1/materials/webhook/status")
        endpoint_url = os.getenv("AWS_SQS_ENDPOINT", "http://localhost:4566")
        region_name = os.getenv("AWS_REGION", "us-east-1")
        
        self.sqs_client = boto3.client(
            "sqs",
            endpoint_url=endpoint_url,
            region_name=region_name
        )

    def notify_internal_webhook(self, job_id: str, status: str, download_url: str = None, error_message: str = None):
        payload = {
            "job_id": job_id,
            "status": status,
        }
        if download_url:
            payload["download_url"] = download_url
        if error_message:
            payload["error_message"] = error_message
            
        try:
            response = requests.post(self.b2b_webhook_url, json=payload, timeout=5)
            response.raise_for_status()
            logger.info(f"Internal webhook notified for job {job_id}: {status}")
        except requests.RequestException as e:
            logger.error(f"Failed to notify internal webhook for job {job_id}: {str(e)}")

    def process_message(self, message: dict):
        """
        Procesa un único mensaje de SQS.
        """
        body = json.loads(message.get('Body', '{}'))
        job_id = body.get('job_id', 'UNKNOWN')
        logger.info(f"Received SQS Event: {job_id}")
        
        connection_id = body.get('notification', {}).get('websocket_connection_id')
        material_type = body.get('material_type', 'UNKNOWN')
        
        try:
            # 1. Ensamblar y subir a S3 (Core API -> Ensamblador -> PDF -> S3) o pausar (Curaduría)
            download_url = material_assembler.assemble(body)
            
            if download_url == "CURATION_REQUIRED":
                logger.info(f"Job {job_id} requires manual curation. Waiting for user action.")
                ws_notifier.notify_success(connection_id, job_id, material_type, "CURATION_REQUIRED")
                self.notify_internal_webhook(job_id, "curation_pending")
            else:
                logger.info(f"Successfully finished processing job_id: {job_id}. Download URL: {download_url}")
                # 2. Notificar por WebSocket si hay connection_id
                ws_notifier.notify_success(connection_id, job_id, material_type, download_url)
                # 3. T021 [US3]: Notificar webhook interno B2B para persistencia
                self.notify_internal_webhook(job_id, "completed", download_url=download_url)
            
        except InsufficientQuestionsError as e:
            logger.error(f"Data validation error for job {job_id}: {str(e)}")
            ws_notifier.notify_failure(connection_id, job_id, str(e))
            self.notify_internal_webhook(job_id, "failed", error_message=str(e))
            # No re-lanzamos porque el error es esperado (US2), el job debe ser eliminado de SQS
            
        except Exception as e:
            logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
            ws_notifier.notify_failure(connection_id, job_id, "Error interno durante la generación del material.")
            self.notify_internal_webhook(job_id, "failed", error_message="Error interno durante la generación del material.")
            # Dependiendo de la política de reintentos, se podría relanzar aquí.
            # Por ahora lo atrapamos para que el SQS Consumer no se caiga.

    def start_polling(self):
        logger.info(f"Starting SQS consumer polling on {self.queue_url}")
        while True:
            try:
                response = self.sqs_client.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=1,
                    WaitTimeSeconds=10 # Long polling
                )
                
                messages = response.get('Messages', [])
                for message in messages:
                    try:
                        self.process_message(message)
                        
                        # Eliminar mensaje una vez procesado con éxito
                        self.sqs_client.delete_message(
                            QueueUrl=self.queue_url,
                            ReceiptHandle=message['ReceiptHandle']
                        )
                        logger.info(f"Message {message['MessageId']} deleted from queue")
                    except Exception as e:
                        logger.error(f"Error processing message {message.get('MessageId')}: {str(e)}")
            except Exception as e:
                logger.error(f"Error connecting to SQS: {str(e)}")
                time.sleep(5)

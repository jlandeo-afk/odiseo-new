import os
import boto3
import json
import logging
import time
from .material_assembler import material_assembler
from .ws_notifier import ws_notifier

logger = logging.getLogger(__name__)

class SQSConsumer:
    def __init__(self):
        self.queue_url = os.getenv("AWS_SQS_QUEUE_URL", "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/odiseo-materials-queue")
        endpoint_url = os.getenv("AWS_SQS_ENDPOINT", "http://localhost:4566")
        region_name = os.getenv("AWS_REGION", "us-east-1")
        
        self.sqs_client = boto3.client(
            "sqs",
            endpoint_url=endpoint_url,
            region_name=region_name
        )

    def process_message(self, message: dict):
        """
        Procesa un único mensaje de SQS.
        """
        body = json.loads(message.get('Body', '{}'))
        job_id = body.get('job_id', 'UNKNOWN')
        logger.info(f"Received SQS Event: {job_id}")
        
        # 1. Ensamblar y subir a S3 (Core API -> Ensamblador -> PDF -> S3)
        download_url = material_assembler.assemble(body)
        
        logger.info(f"Successfully finished processing job_id: {job_id}. Download URL: {download_url}")
        
        # 2. Notificar por WebSocket si hay connection_id
        connection_id = body.get('notification', {}).get('websocket_connection_id')
        material_type = body.get('material_type', 'UNKNOWN')
        ws_notifier.notify_success(connection_id, job_id, material_type, download_url)

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

import os
import boto3
import json
import logging

logger = logging.getLogger(__name__)

class WsNotifier:
    def __init__(self):
        # Configurar cliente boto3 para API Gateway Management API
        endpoint_url = os.getenv("AWS_APIGW_ENDPOINT", "http://localhost:4566")
        region_name = os.getenv("AWS_REGION", "us-east-1")
        
        self.apigw_client = boto3.client(
            "apigatewaymanagementapi",
            endpoint_url=endpoint_url,
            region_name=region_name
        )

    def notify_success(self, connection_id: str, job_id: str, material_type: str, download_url: str):
        """
        Emite el evento de éxito (Success Event) definido en el contrato WebSocket.
        """
        payload = {
            "event": "material.generation.completed",
            "data": {
                "job_id": job_id,
                "material_type": material_type,
                "status": "success",
                "download_url": download_url,
                "expires_in": 3600
            }
        }
        self._send_message(connection_id, payload)

    def notify_failure(self, connection_id: str, job_id: str, error_message: str):
        """
        Emite el evento de fallo (Failure Event) definido en el contrato WebSocket.
        """
        payload = {
            "event": "material.generation.failed",
            "data": {
                "job_id": job_id,
                "status": "error",
                "error_message": error_message
            }
        }
        self._send_message(connection_id, payload)

    def _send_message(self, connection_id: str, payload: dict):
        if not connection_id:
            logger.warning("No connection_id provided. Cannot send WebSocket notification.")
            return

        logger.info(f"Sending WS event '{payload.get('event')}' to connection {connection_id}")
        try:
            self.apigw_client.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps(payload).encode('utf-8')
            )
            logger.info("WebSocket notification sent successfully")
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {str(e)}")
            # No lanzamos la excepción para no reintentar el job SQS solo por fallo del WS.

ws_notifier = WsNotifier()

import os
import boto3
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "odiseo-materials")
        endpoint_url = os.getenv("AWS_S3_ENDPOINT", "http://localhost:4566")
        region_name = os.getenv("AWS_REGION", "us-east-1")
        
        # En boto3, s3v4 se auto-configura habitualmente, pero 
        # config=Config(signature_version='s3v4') podría ser necesario para URLs presignadas
        from botocore.client import Config
        
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=region_name,
            config=Config(signature_version='s3v4')
        )

    def upload_pdf(self, file_content: bytes, file_name: str) -> Optional[str]:
        """
        Subir contenido binario (PDF) al bucket S3 y retornar la URL presignada.
        """
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=file_content,
                ContentType='application/pdf'
            )
            
            # Generar URL de descarga presignada válida por 1 hora
            download_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_name},
                ExpiresIn=3600
            )
            logger.info(f"PDF uploaded successfully. URL generated.")
            return download_url
        except Exception as e:
            logger.error(f"Failed to upload PDF to S3: {str(e)}")
            raise e

s3_service = S3Service()

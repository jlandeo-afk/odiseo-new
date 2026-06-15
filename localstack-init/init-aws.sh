#!/bin/bash
echo "Inicializando recursos de AWS en LocalStack..."

# Crear SQS Queue
awslocal sqs create-queue --queue-name odiseo-materials-queue

# Crear S3 Bucket
awslocal s3 mb s3://odiseo-materials

echo "Recursos de LocalStack creados exitosamente."

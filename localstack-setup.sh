#!/bin/bash
echo "Setting up LocalStack for Odiseo Materials..."

# SQS
awslocal sqs create-queue --queue-name odiseo-materials-queue

# S3
awslocal s3 mb s3://odiseo-materials
awslocal s3api put-bucket-cors --bucket odiseo-materials --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

echo "LocalStack setup complete!"

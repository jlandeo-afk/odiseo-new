import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(S3Service.name);

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:4566',
      forcePathStyle: true, // required for localstack / mock testing
    });
    this.bucketName = process.env.AWS_S3_BUCKET || 'odiseo-materials';
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds: number = 86400): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      return url;
    } catch (error: any) {
      this.logger.error(`Failed to generate presigned URL for key ${key}: ${error.message}`);
      throw error;
    }
  }
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded buffer to S3 with key ${key}`);
      return await this.getPresignedDownloadUrl(key);
    } catch (error: any) {
      this.logger.error(`Failed to upload buffer to S3: ${error.message}`);
      throw error;
    }
  }
}

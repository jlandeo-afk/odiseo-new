import { Injectable, Logger } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import * as AWS from '@aws-sdk/client-sqs';
import { ICatalogRepository } from './repositories/i-catalog.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class SqsCatalogConsumer {
  private readonly logger = new Logger(SqsCatalogConsumer.name);

  constructor(
    @Inject(ICatalogRepository)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  @SqsMessageHandler('catalog-sync-queue', false)
  async handleCatalogSync(message: AWS.Message) {
    try {
      const body = JSON.parse(message.Body || '{}');
      this.logger.log(`Received SQS sync event: ${body.eventType}`);

      if (body.eventType === 'TopicsSynced') {
        const topics = body.data; // Array of { id, coreName, courseId }
        // Aquí deberíamos ejecutarlo por cada tenant activo si el SQS es global
        // Para simplificar, asumiremos que usamos runInSchema o lo iteramos.
        // Simularemos la inserción usando el repositorio (que actualmente inyecta el TenantService).
        // NOTA: Para un worker global, deberíamos inyectar y setear explícitamente el schema.
        await this.catalogRepository.upsertTopicsFromCore(topics);
        this.logger.log(`Successfully synced ${topics.length} topics`);
      }
    } catch (error) {
      this.logger.error('Failed to process SQS message', error);
      throw error; // Dejar que SQS maneje el re-intento
    }
  }
}

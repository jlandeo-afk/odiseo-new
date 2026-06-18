import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ICatalogRepository } from './repositories/i-catalog.repository';

@Injectable()
export class CatalogCronService {
  private readonly logger = new Logger(CatalogCronService.name);

  constructor(
    @Inject(ICatalogRepository)
    private readonly catalogRepository: ICatalogRepository,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncCatalogs() {
    this.logger.log('Starting sync of catalogs from Core API...');
    try {
      const coreApiUrl =
        this.configService.get<string>('CORE_API_URL') ||
        'http://localhost:3000/api/catalogs';

      const response = await fetch(coreApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add API Key or Auth token if needed
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch catalogs from Core API: ${response.statusText}`,
        );
      }

      const payload = await response.json();

      await this.catalogRepository.upsertCatalogs(payload);

      this.logger.log(
        'Successfully synchronized catalogs to the public schema.',
      );
    } catch (error: any) {
      this.logger.error(
        `Error during catalog sync: ${error.message}`,
        error.stack,
      );
    }
  }
}

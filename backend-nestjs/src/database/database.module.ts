import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantService } from './tenant.service';
import { Company } from '../tenants/entities/tenant.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'postgres'),
        database: config.get<string>('DB_NAME', 'odiseo'),
        autoLoadEntities: true,
        synchronize: true,
        logging: ['error', 'warn'],
      }),
    }),
    // Company entity needed by TenantMiddleware (global scope)
    TypeOrmModule.forFeature([Company]),
  ],
  providers: [TenantService],
  exports: [TenantService, TypeOrmModule],
})
export class DatabaseModule {}

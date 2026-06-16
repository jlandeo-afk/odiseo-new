import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Controller('v1/tenants')
export class TenantsController {
  
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>
  ) {}

  @Get('branding')
  async getBranding(@Query('subdomain') subdomain: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { subdominio: subdomain }
    });

    if (!tenant) {
      return {
        commercialName: 'Odiseo B2B Default',
        primaryColor: '#000000',
        logoUrl: null
      };
    }
    return {
      commercialName: tenant.commercialName,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor
    };
  }
}

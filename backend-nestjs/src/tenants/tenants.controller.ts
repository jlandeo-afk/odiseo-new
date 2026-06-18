import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/tenant.entity';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('v1')
export class TenantsController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get('tenants/branding')
  async getBranding(@Query('subdomain') subdomain: string) {
    if (!subdomain) {
      return {
        commercialName: 'Odiseo B2B Default',
        logoUrl: null,
        primaryColor: '#6366f1',
      };
    }

    const company = await this.companyRepository.findOne({
      where: { subdomain },
    });

    if (!company) {
      // EC-001: Never 404, return default branding for unknown subdomains
      return {
        commercialName: 'Odiseo B2B Default',
        logoUrl: null,
        primaryColor: '#6366f1',
      };
    }

    return {
      commercialName: company.commercialName,
      logoUrl: company.logoUrl,
      primaryColor: company.primaryColor,
    };
  }

  @Post('admin/companies')
  @UseGuards(JwtAuthGuard)
  async createCompany(@Body() dto: CreateCompanyDto) {
    // TODO: In future, validate super-admin role from request.user
    const company = await this.tenantsService.createCompany({
      subdomain: dto.subdomain,
      commercialName: dto.commercialName,
      logoUrl: dto.logoUrl,
      primaryColor: dto.primaryColor,
    });

    return {
      id: company.id,
      subdomain: company.subdomain,
      commercialName: company.commercialName,
      logoUrl: company.logoUrl,
      primaryColor: company.primaryColor,
      schemaName: `tenant_${company.id}`,
      createdAt: company.createdAt,
    };
  }
}

import { Controller, Get, Query } from '@nestjs/common';

@Controller('v1/tenants')
export class TenantsController {
  
  private readonly brandingDb = {
    'colegio': {
      commercialName: 'Colegio A',
      logoUrl: 'https://via.placeholder.com/150/1e88e5/ffffff?text=ColegioA',
      primaryColor: '#1e88e5'
    },
    'escuela': {
      commercialName: 'Escuela B',
      logoUrl: 'https://via.placeholder.com/150/e53935/ffffff?text=EscuelaB',
      primaryColor: '#e53935'
    }
  };

  @Get('branding')
  getBranding(@Query('subdomain') subdomain: string) {
    const branding = this.brandingDb[subdomain];
    if (!branding) {
      return {
        commercialName: 'Odiseo B2B Default',
        primaryColor: '#000000'
      };
    }
    return branding;
  }
}

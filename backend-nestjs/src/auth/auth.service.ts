import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly users = [
    {
      id: 'uuid-admin-1',
      email: 'admin@colegio.com',
      password: 'password123',
      name: 'Admin Colegio A',
      companyId: 'uuid-company-A',
      roles: ['super-admin'],
      permissions: ['generate_material', 'curate_material']
    },
    {
      id: 'uuid-admin-2',
      email: 'admin@escuela.com',
      password: 'password123',
      name: 'Admin Colegio B',
      companyId: 'uuid-company-B',
      roles: ['admin'],
      permissions: ['generate_material']
    }
  ];

  private readonly companies = {
    'colegio': 'uuid-company-A',
    'escuela': 'uuid-company-B'
  };

  async validateUser(email: string, pass: string, subdomain: string): Promise<any> {
    const expectedCompanyId = this.companies[subdomain];
    
    if (!expectedCompanyId) {
      return null;
    }

    const user = this.users.find(u => u.email === email && u.password === pass);
    if (!user) {
      return null;
    }

    // AISLAMIENTO ESTRICTO: Verificar company_id
    if (user.companyId !== expectedCompanyId) {
      return null; // El usuario pertenece a otro tenant
    }

    return user;
  }
}

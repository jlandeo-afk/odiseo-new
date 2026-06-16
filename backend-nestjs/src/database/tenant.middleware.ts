import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extraer subdominio de x-subdomain header o de host
    const host = req.headers.host || '';
    let subdomain = req.headers['x-subdomain'] as string;
    
    if (!subdomain && host) {
      const parts = host.split('.');
      if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
         subdomain = parts[0];
      } else if (parts[0] === 'localhost') {
         subdomain = 'public'; // fallback
      }
    }

    // Default to public schema if no subdomain
    subdomain = subdomain || 'public';

    this.cls.set('subdomain', subdomain);
    
    // El tenant schema se determina por company_id, pero primero se resuelve el subdomain
    // Lo setearemos en otro paso, por ahora guardamos el subdomain
    next();
  }
}

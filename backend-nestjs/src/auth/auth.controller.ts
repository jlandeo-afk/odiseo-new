import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const { email, password, subdomain } = body;
    
    if (!email || !password || !subdomain) {
      throw new UnauthorizedException('Missing credentials or subdomain');
    }

    const user = await this.authService.validateUser(email, password, subdomain);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas o acceso denegado para esta institución.');
    }

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        roles: user.roles || [],
        permissions: user.permissions || [],
      }
    };
  }
}

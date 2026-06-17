# Quickstart: Fundamentos y Autenticación B2B

Guía de validación end-to-end del flujo de autenticación y multi-tenant.

## Prerequisites

1. **PostgreSQL 16+** corriendo localmente o en Docker.
2. **Node.js 18+** instalado.
3. **Backend NestJS** con dependencias instaladas (`npm install` en `backend-nestjs/`).
4. **Frontend Nuxt 3** con dependencias instaladas (`npm install` en `frontend-vue/`).

## Setup Inicial

### 1. Base de datos

```bash
# Crear la base de datos
createdb odiseo_b2b

# El esquema public se usa para datos globales (companies)
# Los schemas de tenant se crean automáticamente via API
```

### 2. Variables de entorno

```bash
# backend-nestjs/.env
DATABASE_URL=postgresql://user:password@localhost:5432/odiseo_b2b
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=24h
```

## Validation Steps

### 1. Iniciar los servicios

Terminal 1 (Backend):
```bash
cd backend-nestjs
npm run start:dev
```

Terminal 2 (Frontend):
```bash
cd frontend-vue
npm run dev
```

### 2. Crear una empresa (provisionar tenant)

```bash
# Nota: En V1, este endpoint requiere un super-admin token.
# Para testing inicial, se puede proteger con un API key simple.

curl -X POST http://localhost:3000/api/v1/admin/companies \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "colegio",
    "commercial_name": "Colegio Innovador",
    "logo_url": "https://via.placeholder.com/150",
    "primary_color": "#1e88e5"
  }'
```

**Esperado**: HTTP 201 con el company_id y schema_name.

### 3. Verificar branding

```bash
curl http://localhost:3000/api/v1/tenants/branding?subdomain=colegio
```

**Esperado**: JSON con `commercialName`, `logoUrl`, `primaryColor` del colegio.

### 4. Login (ver contrato: [api-auth-login.md](./contracts/api-auth-login.md))

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@colegio.com",
    "password": "password123",
    "subdomain": "colegio"
  }'
```

**Esperado**: HTTP 200 con user data. Cookie `jwt` guardada en `cookies.txt`.

### 5. Rehidratación de sesión (ver contrato: [api-auth-me.md](./contracts/api-auth-me.md))

```bash
curl http://localhost:3000/api/v1/auth/me \
  -b cookies.txt
```

**Esperado**: HTTP 200 con los mismos datos del usuario.

### 6. Test de aislamiento cross-tenant

```bash
# Intentar login con usuario de "colegio" en subdominio "escuela"
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@colegio.com",
    "password": "password123",
    "subdomain": "escuela"
  }'
```

**Esperado**: HTTP 401 Unauthorized. El aislamiento cross-tenant funciona.

### 7. Frontend visual

1. Navegar a `http://colegio.localhost:3000/login`
2. Verificar que el logo y colores del colegio se muestran
3. Login exitoso → redirige al dashboard
4. Recargar página → sesión persiste (cookie + /auth/me)

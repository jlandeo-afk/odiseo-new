# Implementation Plan: Fundamentos y Autenticación B2B

**Branch**: `001-fundamentos-b2b` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fundamentos-b2b/spec.md`

## Summary

Establecimiento de la base arquitectónica B2B Enterprise para Odiseo. Este módulo abarca:
- **Backend NestJS**: Multi-tenant con Schema-per-tenant en PostgreSQL, autenticación JWT con cookies httpOnly, RBAC basado en Spatie, administración de empresas con provisión automática de schemas.
- **Frontend Nuxt 3**: Design System B2B con Tailwind + Nuxt UI, Pinia para estado global, RBAC en middleware, branding dinámico por subdominio, persistencia de sesión via `/auth/me`.

## Technical Context

**Language/Version**: TypeScript (NestJS 10+, Nuxt 3, Vue 3 Composition API)

**Primary Dependencies**:
- Backend: `@nestjs/jwt`, `nestjs-cls` (CLS context), `typeorm`, `bcrypt`, `cookie-parser`
- Frontend: Tailwind CSS, Nuxt UI / Shadcn-Vue, Pinia, `@vueuse/core`

**Storage**: PostgreSQL 16 (Schema-per-tenant)

**Testing**: Jest (backend unit + E2E), Vitest (frontend unit)

**Target Platform**: B2B SaaS Web Application

**Project Type**: Web application (Backend API + Frontend SPA)

**Performance Goals**: Login < 500ms, Branding fetch < 200ms, Session rehidration < 300ms

**Constraints**:
- Aislamiento físico absoluto entre tenants (zero data leaks)
- JWT httpOnly cookies (no localStorage para tokens)
- V1 solo con rol `admin`

**Scale/Scope**: Múltiples tenants (colegios), ~10-50 en primera fase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Separación de Dominios**: El SaaS B2B no almacena reactivos ni imágenes del banco — solo referencias lógicas. ✅
- [x] **Clean Architecture**: La lógica de negocio es independiente de la UI y frameworks. Use Cases no tocan ORM directamente. ✅
- [x] **Asincronía Extrema**: No aplica directamente a este módulo (auth es síncrono por naturaleza). ✅ Compatible.
- [x] **Tech Stack**: NestJS + Nuxt 3 + PostgreSQL. ✅ Alineado.
- [x] **Aislamiento Físico**: Schema-per-tenant en PostgreSQL, nunca Row-level tenancy. ✅
- [x] **Antipatrón nunca Row-level**: Confirmado Schema-per-tenant. ✅

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ FLUJO DE AUTENTICACIÓN B2B                                      │
│                                                                 │
│  Browser                  NestJS                   PostgreSQL   │
│  ───────                  ──────                   ──────────   │
│                                                                 │
│  1. Navega a colegio.odiseo.com                                 │
│  │                                                              │
│  2. GET /tenants/branding?subdomain=colegio                     │
│  │──────────────────────►│                                      │
│  │                       │─── SELECT FROM public.clientes_emp.──►│
│  │◄──────────────────────│◄── {logo, color, name} ──────────────│
│  │                                                              │
│  3. Muestra login con branding                                  │
│  │                                                              │
│  4. POST /auth/login {email, pass, subdomain}                   │
│  │──────────────────────►│                                      │
│  │                       │─── Resolve company_id from subdomain─►│
│  │                       │─── SET search_path TO tenant_<id> ──►│
│  │                       │─── SELECT FROM users WHERE email ───►│
│  │                       │─── Validate password (bcrypt) ──────│ │
│  │                       │─── Assert user.company_id == tenant ─│ │
│  │                       │─── Generate JWT ────────────────────│ │
│  │◄──────────────────────│◄── Set-Cookie: jwt=...; httpOnly ───│ │
│  │◄──────────────────────│◄── Body: {user, roles, permissions} ─│ │
│  │                                                              │
│  5. Pinia hydrates auth store                                   │
│  │                                                              │
│  6. (Page refresh) GET /auth/me                                 │
│  │──────────────────────►│                                      │
│  │                       │─── Verify JWT from cookie ──────────│ │
│  │                       │─── Return user data ────────────────│ │
│  │◄──────────────────────│◄── Body: {user, roles, permissions} ─│ │
│  │                                                              │
│  7. Middleware protects routes based on RBAC                    │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

### Documentation (this feature)

```text
specs/001-fundamentos-b2b/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-branding.md
│   ├── api-auth-login.md
│   ├── api-auth-me.md
│   └── api-admin-companies.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend-nestjs/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts          # JWT Auth Guard
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── login-response.dto.ts
│   ├── tenants/
│   │   ├── tenants.controller.ts
│   │   ├── tenants.module.ts
│   │   ├── tenants.service.ts      # Company provisioning
│   │   ├── entities/
│   │   │   └── tenant.entity.ts
│   │   └── dto/
│   │       └── create-company.dto.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── tenant.middleware.ts    # Resolves subdomain → tenantSchema
│   │   └── tenant.service.ts      # runInTenant with CLS
│   └── main.ts
└── test/
    ├── auth.e2e-spec.ts
    └── tenant-isolation.e2e-spec.ts

frontend-vue/
├── src/
│   ├── layouts/
│   │   └── b2b.vue
│   ├── pages/
│   │   └── login.vue
│   ├── stores/
│   │   └── auth.store.ts
│   ├── middleware/
│   │   └── auth.global.ts
│   └── app.vue
└── tests/
    └── unit/
        └── auth.store.spec.ts
```

**Structure Decision**: Web application with separated backend (NestJS) and frontend (Nuxt 3) directories at the monorepo root. Feature-specific code lives within NestJS modules (backend) and FSD features (frontend).

## Complexity Tracking

No constitution violations detected. All design decisions align with the established principles.

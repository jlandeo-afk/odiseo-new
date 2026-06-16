# Implementation Plan: Fundamentos y Autenticación B2B

**Branch**: `002-fundamentos-b2b` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-fundamentos-b2b/spec.md`

## Summary

Establecimiento de la base arquitectónica B2B Enterprise para Odiseo. Este módulo abarca la adopción del diseño "Clean Architecture" en el frontend B2B empleando herramientas de grado SaaS (Tailwind CSS, Nuxt UI), y el desarrollo de la capa fundacional del backend en NestJS que garantiza un aislamiento rígido de datos mediante la estrategia "Schema-per-tenant" de PostgreSQL y seguridad basada en RBAC (Roles y Permisos de Spatie).

## Technical Context

**Language/Version**: TypeScript (NestJS 10+, Nuxt 3, Vue 3)
**Primary Dependencies**: Tailwind CSS, Shadcn-Vue / Nuxt UI, Pinia
**Storage**: PostgreSQL 16
**Architecture Pattern**: Clean Architecture (Frontend), Schema-per-tenant (Database)
**Target Platform**: B2B SaaS Environment
**Constraints**: 
- Aislamiento Físico Absoluto (Cero posibilidad de colisión o filtración de datos entre colegios), validación estricta de subdominio frente a la identidad del usuario.
- **Estrategia de Persistencia Híbrida (Patrón Repositorio Estricto)**: 
  - Se utilizará TypeORM (o el ORM principal) para el 80% de operaciones estándar (CRUD, catálogos, autenticación) y para gestionar dinámicamente el cambio de esquemas inyectando el `search_path`.
  - Se utilizará ejecución nativa (Raw SQL) aislada dentro de los repositorios para el 20% de operaciones complejas (jerarquías pesadas, operadores JSONB, y ejecución de Stored Procedures / funciones void).
  - Los Casos de Uso (Services/Use Cases) en NestJS tienen **estrictamente prohibido interactuar con el ORM directamente**; solo interactuarán con las interfaces abstractas de los Repositorios.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Aislamiento B2B**: Garantizado. Las operaciones en base de datos se confinan a esquemas (`schemas`) específicos de PostgreSQL inyectados en tiempo de ejecución.
- [x] **Criterios de Calidad**: Las interfaces del frontend delegan toda la manipulación de estado y llamadas API a la capa de dominio en Pinia (Clean Architecture UI).

## Architecture Flow

0. **Frontend B2B Layout Initialization**:
   - El cliente navega a la URL (ej. `colegio.odiseo.com`).
   - La vista de Login de Nuxt o el layout base emiten una petición `GET` no autenticada hacia `/api/v1/tenants/branding?subdomain=colegio`.
   - El frontend aplica los tokens CSS dinámicos (colores, logo).

1. **Autenticación Aislada (Login Request)**:
   - El usuario introduce credenciales. El frontend envía un payload que incluye el `subdominio` contextual.
   - NestJS procesa el login consultando la identidad.
   - El servicio de Auth verifica la contraseña y ejecuta la aserción de seguridad: `user.company_id === tenant.company_id`. Si no coincide, detiene el flujo (401 Unauthorized).

2. **Spatie RBAC Hydration**:
   - Tras el éxito de autenticación, el servidor junta el payload de sesión y enlista el array de roles y permisos derivados del sistema Spatie del usuario en ese esquema.
   - Retorna la sesión al frontend.
   - Pinia (`auth.store.ts`) guarda el usuario e hidrata el control de acceso en memoria.

3. **Route Protection (Middleware)**:
   - El archivo global `auth.global.ts` intercepta la navegación del usuario.
   - Valida el estado general de la sesión y verifica explícitamente los arrays inyectados mediante utilidades `hasRole('x')` o `hasPermission('y')`.
   - Elementos visuales como menús usan `v-if="hasPermission('view_materials')"` para mostrarse u ocultarse.

## Project Structure

### Documentation (this feature)

```text
specs/002-fundamentos-b2b/
├── plan.md              # This file
├── spec.md
├── tasks.md
```

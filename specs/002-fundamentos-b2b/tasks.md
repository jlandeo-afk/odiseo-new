# Tasks: Fundamentos y Autenticación B2B

**Input**: Design documents from `/specs/002-fundamentos-b2b/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by phase and user story to enforce Vertical Slicing. Las pruebas unitarias y E2E están obligatoriamente incluidas para validar la seguridad y los fundamentos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup Core

**Purpose**: Inicialización técnica del monorepo y bases del entorno Frontend/Backend.

- [ ] T001 [P] Frontend: Configurar e instalar Tailwind CSS y `@nuxt/ui` o Shadcn-Vue en `frontend-vue` asegurando soporte para colorización/theming dinámico B2B.
- [ ] T002 Backend: Establecer la base técnica de NestJS en `backend-nestjs` configurando Módulos, Logger global, validaciones de Pipes e interceptores base.

## Phase 2: User Story 1 - Aislamiento Físico y Multi-tenant (Priority: P1)

**Goal**: Configurar la infraestructura Multi-tenant a nivel de base de datos en PostgreSQL.

- [ ] T003 [US1] Backend: Configurar TypeORM/Prisma o el mecanismo nativo de BD para conectarse a PostgreSQL implementando una estrategia de ruteo *Schema-per-tenant*.
- [ ] T004 [US1] Backend: Crear la migración inicial o modelos de la base de datos para el esquema `public` (tabla `clientes_empresas` con columna `subdominio`).
- [ ] T005 [US1] Backend: Implementar un middleware o interceptor global en NestJS que detecte el tenant por header/token y conmute o establezca el `search_path` de PostgreSQL en tiempo real por cada petición HTTP.

## Phase 3: User Story 2 & 3 - Login SaaS Robusto y RBAC Frontend (Priority: P1)

**Goal**: Integrar el flujo de autenticación seguro, branding por subdominio y control UI basado en permisos.

- [ ] T006 [P] [US2] Backend: Implementar endpoint público `GET /api/v1/tenants/branding` en NestJS para retornar logo y color consultando la tabla `clientes_empresas`.
- [ ] T007 [P] [US2] Frontend: Construir el Layout B2B base (`layouts/b2b.vue`) separando la UI de la lógica de dominio siguiendo Clean Architecture.
- [ ] T008 [US2] Frontend: Implementar vista de Login (`pages/login.vue`) que detecte el host de `window.location.hostname` y precargue el branding B2B.
- [ ] T009 [US2] Backend: Implementar endpoint `POST /api/v1/auth/login` ejecutando validación incondicional del `company_id` del usuario (tabla `users`) cruzándolo contra la identidad del subdominio solicitado.
- [ ] T010 [US3] Frontend: Implementar el store Pinia en `stores/auth.store.ts` para hidratar y exponer el estado, roles y permisos de Spatie post-login.
- [ ] T011 [US3] Frontend: Implementar Middleware global de enrutador en Nuxt (`middleware/auth.global.ts`) validando las rutas contra los roles de Spatie en memoria.

## Phase 4: Testing & Validation (Obligatorio)

**Purpose**: Garantizar que los cimientos de la arquitectura y la seguridad no pueden fallar por regresiones.

- [ ] T012 [P] Frontend Unit Tests: Escribir pruebas unitarias (`tests/unit/auth.store.spec.ts`) validando que el método `hasRole` y `hasPermission` operan correctamente bajo distintas variaciones de perfiles.
- [ ] T013 Backend E2E Tests: Escribir escenario de prueba de integración End-to-End en `test/auth.e2e-spec.ts` simulando un login cruzado y asegurando que un usuario de Tenant A recibe estrictamente código de error HTTP 401 si intenta autenticarse en el subdominio del Tenant B.

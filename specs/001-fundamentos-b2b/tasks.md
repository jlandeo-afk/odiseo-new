# Tasks: Fundamentos y Autenticación B2B

**Input**: Design documents from `/specs/001-fundamentos-b2b/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks organized by user story (Vertical Slicing). TDD approach: tests written before implementation where applicable. Parallel tasks marked with [P].

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Inicialización técnica del proyecto y dependencias necesarias.

- [ ] T001 Install and configure `@nestjs/jwt`, `cookie-parser`, `bcrypt`, and `nestjs-cls` in `backend-nestjs/package.json`
- [ ] T002 [P] Configure Tailwind CSS and Nuxt UI in `frontend-vue/` ensuring B2B theming support with dynamic CSS variables
- [ ] T003 [P] Configure Jest for backend unit tests and Vitest for frontend unit tests

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura multi-tenant que bloquea todas las user stories.

- [ ] T004 Create database migration for `public.companies` table with columns: `id` (uuid PK), `subdomain` (unique), `commercial_name`, `logo_url`, `primary_color`, `is_active`, timestamps. File: `backend-nestjs/src/migrations/`
- [ ] T005 Create database migration for tenant schema base tables: `users`, `roles`, `permissions`, `model_has_roles`, `role_has_permissions` per data-model.md. File: `backend-nestjs/src/migrations/`
- [ ] T006 Fix `TenantMiddleware` in `backend-nestjs/src/database/tenant.middleware.ts` to resolve subdomain → company_id by querying `public.companies`, then set `tenantSchema = tenant_<company_id>` in CLS. Currently only stores subdomain.
- [ ] T007 Update `TenantService.runInTenant()` in `backend-nestjs/src/database/tenant.service.ts` to read `tenantSchema` from CLS (verify compatibility with fixed middleware)

## Phase 3: User Story 1 — Aislamiento Físico y Multi-tenant (P1)

**Goal**: El middleware de persistencia aísla cada tenant a nivel de schema PostgreSQL.

**Independent Test**: Query ejecutada dentro de tenant A no puede ver datos de tenant B.

- [ ] T008 [US1] Write unit test for `TenantMiddleware` in `backend-nestjs/src/database/tenant.middleware.spec.ts`: test subdomain resolution, unknown subdomain returns 400, CLS sets tenantSchema correctly
- [ ] T009 [US1] Write E2E test for tenant isolation in `backend-nestjs/test/tenant-isolation.e2e-spec.ts`: create two tenants, insert data in each, verify cross-schema query returns empty

## Phase 4: User Story 2 — Login SaaS Robusto y Branding Dinámico (P1)

**Goal**: Login seguro con JWT httpOnly cookie y branding por subdominio.

**Independent Test**: Login exitoso retorna cookie. Login cruzado (user de tenant A en subdomain B) retorna 401.

- [ ] T010 [P] [US2] Write unit test for `AuthService.validateUser()` in `backend-nestjs/src/auth/auth.service.spec.ts`: test valid credentials, invalid password, cross-tenant rejection, unknown subdomain
- [ ] T011 [US2] Refactor `AuthService` in `backend-nestjs/src/auth/auth.service.ts` to replace mock data with real DB queries: resolve company from subdomain, find user in tenant schema with bcrypt password validation, generate JWT with claims (sub, company_id, roles, permissions)
- [ ] T012 [P] [US2] Create `LoginDto` and `LoginResponseDto` in `backend-nestjs/src/auth/dto/login.dto.ts` and `login-response.dto.ts` per contract `api-auth-login.md`
- [ ] T013 [US2] Update `AuthController` in `backend-nestjs/src/auth/auth.controller.ts` to use `@nestjs/jwt` for token generation and set `res.cookie('jwt', token, { httpOnly: true, secure: true, sameSite: 'strict' })`
- [ ] T014 [P] [US2] Create `JwtAuthGuard` in `backend-nestjs/src/auth/auth.guard.ts` that extracts JWT from cookie (not Authorization header), validates, and attaches user to request
- [ ] T015 [US2] Update `TenantsController` in `backend-nestjs/src/tenants/tenants.controller.ts` to return default branding for unknown subdomains (never 404) per contract `api-branding.md`
- [ ] T016 [US2] Update E2E tests in `backend-nestjs/test/auth.e2e-spec.ts` to validate cookie-based auth flow: login sets cookie, cross-tenant login returns 401, branding returns default for unknown
- [ ] T017 [P] [US2] Build Login page in `frontend-vue/src/pages/login.vue`: detect subdomain from `window.location.hostname`, fetch branding via `GET /tenants/branding`, display dynamic logo/colors, submit credentials with subdomain context

## Phase 5: User Story 3 — Aislamiento Frontend y RBAC (P1)

**Goal**: UI adapta menú y rutas según roles/permisos del usuario.

**Independent Test**: Usuario sin permiso `generate_material` no ve el menú de materiales. Navegación directa a ruta protegida retorna 403.

- [ ] T018 [P] [US3] Write unit test for `auth.store` in `frontend-vue/tests/unit/auth.store.spec.ts`: test `hasRole()`, `hasPermission()`, `login()` hydration, `logout()` cleanup
- [ ] T019 [US3] Update `auth.store.ts` in `frontend-vue/src/stores/auth.store.ts` to use cookie-based auth (remove manual token management), add `fetchMe()` method that calls `GET /auth/me`, ensure `login()` response hydrates roles and permissions
- [ ] T020 [US3] Update `auth.global.ts` middleware in `frontend-vue/src/middleware/auth.global.ts` to call `fetchMe()` on app initialization for session rehidration, store intended route for post-login redirect (EC-003)
- [ ] T021 [P] [US3] Build B2B Layout in `frontend-vue/src/layouts/b2b.vue` with dynamic navigation menu that shows/hides items based on `hasPermission()` checks

## Phase 6: User Story 4 — Administración de Empresas (P1)

**Goal**: Super-admin puede crear empresas y provisionar schemas automáticamente.

**Independent Test**: POST /admin/companies creates record in public.companies and provisions PostgreSQL schema.

- [ ] T022 [P] [US4] Write unit test for `TenantsService.createCompany()` in `backend-nestjs/src/tenants/tenants.service.spec.ts`: test schema creation, duplicate subdomain rejection, migration execution
- [ ] T023 [US4] Create `TenantsService` in `backend-nestjs/src/tenants/tenants.service.ts` with `createCompany()` method: INSERT into `public.companies`, execute `CREATE SCHEMA tenant_<company_id>`, run base migrations, seed V1 admin role with all permissions
- [ ] T024 [US4] Create `CreateCompanyDto` in `backend-nestjs/src/tenants/dto/create-company.dto.ts` with validation per contract `api-admin-companies.md`
- [ ] T025 [US4] Update `TenantsController` in `backend-nestjs/src/tenants/tenants.controller.ts` to add `POST /admin/companies` endpoint protected by `JwtAuthGuard` + super-admin role check
- [ ] T026 [US4] Write E2E test in `backend-nestjs/test/companies.e2e-spec.ts`: create company, verify schema exists, verify branding returns for new subdomain, verify duplicate subdomain returns 409

## Phase 7: User Story 5 — Persistencia de Sesión (P1)

**Goal**: Sesión persiste tras page refresh via cookie httpOnly + GET /auth/me.

**Independent Test**: Page refresh mantiene sesión activa. Token expirado redirige a login.

- [ ] T027 [US5] Create `GET /auth/me` endpoint in `backend-nestjs/src/auth/auth.controller.ts` protected by `JwtAuthGuard`, returns current user data from JWT claims per contract `api-auth-me.md`
- [ ] T028 [US5] Write E2E test for session persistence in `backend-nestjs/test/auth.e2e-spec.ts`: login → get cookie → call /auth/me → verify user data. Test expired token returns 401.

## Phase 8: Polish & Cross-Cutting

**Purpose**: Validación final, skeletons de carga, y theming responsivo.

- [ ] T029 [P] Add loading skeletons to Login page and B2B Layout in `frontend-vue/src/pages/login.vue` and `frontend-vue/src/layouts/b2b.vue` for async operations (branding fetch, auth check)
- [ ] T030 [P] Implement B2B dynamic theming: apply `primaryColor` from branding as CSS custom property `--color-primary` in `frontend-vue/src/layouts/b2b.vue`
- [ ] T031 Run all backend unit tests and E2E tests, verify 100% pass rate. Fix any regressions.
- [ ] T032 Run all frontend unit tests, verify 100% pass rate.

## Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational: T004-T007)
       ├── Phase 3 (US1: Tenant Isolation) — T008-T009
       ├── Phase 4 (US2: Login + Branding) — T010-T017
       │    └── Phase 5 (US3: RBAC Frontend) — T018-T021
       │    └── Phase 6 (US4: Admin Companies) — T022-T026
       │    └── Phase 7 (US5: Session Persistence) — T027-T028
       └── Phase 8 (Polish) — T029-T032
```

## Implementation Strategy

**MVP Scope**: Phases 1-4 (Setup + Foundational + US1 + US2). Esto provee login funcional con aislamiento multi-tenant. Las fases 5-7 se pueden implementar incrementalmente.

**Parallel Opportunities**: Tasks marcados [P] pueden ejecutarse simultáneamente dentro de su fase. Ej: T010, T012 y T014 son paralelos en la Fase 4.

**TDD Flow per Task**: Para tasks que tienen un test asociado precedente (ej. T010 antes de T011):
1. 🔴 Escribir test → FALLA
2. 🟢 Implementar código → PASA
3. 🔵 Refactorizar → SIGUE PASANDO

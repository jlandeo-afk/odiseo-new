# Tasks: Catálogos Simplificados y Gestión del Tiempo Académico

**Input**: Design documents from `/specs/002-catalogos-tiempo-b2b/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: De acuerdo con la constitución, se exige la creación obligatoria de `test-cases.md` con escenarios BDD (Gherkin) y Unit Tests (Vitest para frontend, Jest para backend NestJS).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup & Foundational

**Purpose**: Core infrastructure that MUST be complete before user stories can be implemented.

- [x] T001 Inicializar el archivo `specs/002-catalogos-tiempo-b2b/test-cases.md` estructurando las secciones de BDD Scenarios (Gherkin) y Unit Tests.
- [x] T002 Crear migraciones SQL para crear las tablas `courses`, `topics` y `subtopics` estrictamente en el esquema `public`.
- [x] T003 Crear migraciones SQL para crear las tablas `tenant_topic_visibility`, `cycles` y `cycle_weeks` en los esquemas de tenant.
- [x] T004 [P] Crear TypeORM entities para las tablas del esquema `public` en `backend-nestjs/src/catalogs/entities/`.
- [x] T005 [P] Crear TypeORM entities para las tablas del esquema tenant en `backend-nestjs/src/academic-time/entities/`.

**Checkpoint**: Base de datos lista. Las historias pueden comenzar.

---

## Phase 2: User Story 2 - Sincronización Programada (Cron Job) (Priority: P1)

**Goal**: Descargar catálogos del Core API y mantenerlos en el esquema `public`. (Esta US se adelanta porque la US1 requiere que la data ya exista).

**Independent Test**: Ejecutar el Cron manualmente y revisar la BD.

### Tests
- [x] T006 [P] [US2] Escribir escenarios BDD en `test-cases.md` para el flujo del Cron Job.
- [x] T007 [P] [US2] Escribir tests unitarios (Jest) para el servicio Cron en `backend-nestjs/src/catalogs/catalog.cron.spec.ts`.

### Implementation
- [x] T008 [US2] Implementar método de repositorio `upsertCatalogs` usando Raw SQL para actualizar el esquema `public` en `backend-nestjs/src/catalogs/repositories/catalog.repository.ts`.
- [x] T009 [US2] Instalar y configurar `@nestjs/schedule` en el `AppModule` si no existe.
- [x] T010 [US2] Crear `CatalogCronService` en `backend-nestjs/src/catalogs/catalog.cron.ts` para hacer API Polling y llamar al repositorio.

---

## Phase 3: User Story 1 - Visibilidad de Taxonomía (Priority: P1)

**Goal**: Ocultar temas adaptando el catálogo localmente sin modificar nombres.

**Independent Test**: Togglear un tema en UI y verificar que desaparece de la vista operativa.

### Tests
- [x] T011 [P] [US1] Escribir escenarios BDD en `test-cases.md` para ocultamiento de temas.
- [x] T012 [P] [US1] Escribir tests unitarios (Vitest) para los componentes y stores de catálogos en `frontend-vue/src/features/catalogs/`.

### Implementation
- [x] T013 [P] [US1] Implementar `PATCH /api/v1/catalogs/topics/:id/visibility` en `backend-nestjs/src/catalogs/catalogs.controller.ts` y su Use Case.
- [x] T014 [US1] Refactorizar `GET /api/v1/catalogs` en el backend para hacer JOIN entre `public.topics` y `tenant_topic_visibility`.
- [x] T015 [P] [US1] Refactorizar el composable/Store `useCatalogsStore` en `frontend-vue/src/features/catalogs/store/index.ts` con types estrictos.
- [x] T016 [US1] Actualizar `CatalogTable.vue` asegurando que el listado sea readonly y solo el toggle de visibilidad interactúe con el Store.

---

## Phase 4: User Story 3 - Tableros de Tiempo Académico (Priority: P1)

**Goal**: Crear y gestionar ciclos calculando fechas matemáticamente y aplicando soft-deletes condicionales.

**Independent Test**: Crear ciclo de 16 semanas, validar fechas. Intentar eliminarlo con relaciones.

### Tests
- [x] T017 [P] [US3] Escribir escenarios BDD en `test-cases.md` para creación, cálculo de fechas y soft-delete de ciclos/semanas.
- [x] T018 [P] [US3] Escribir tests unitarios (Jest) para la lógica matemática de fechas en `backend-nestjs/src/academic-time/academic-time.use-case.spec.ts`.
- [x] T019 [P] [US3] Escribir tests unitarios (Vitest) para validaciones de formulario y componentes en el frontend.

### Implementation Backend
- [x] T020 [P] [US3] Implementar `POST /api/v1/academic-time/cycles` en el backend. Aplicar fórmula `start_date + (N-1)*7` para las semanas.
- [x] T021 [US3] Implementar `PATCH /api/v1/academic-time/cycles/:id/visibility` y `PATCH .../weeks/:id/visibility`.
- [x] T022 [US3] Implementar `DELETE /api/v1/academic-time/cycles/:id` con la restricción de que lance `409 Conflict` si hay relaciones, permitiendo solo soft-delete si está vacío.

### Implementation Frontend
- [x] T023 [P] [US3] Crear Store `useAcademicTimeStore` en `frontend-vue/src/features/academic-time/store/index.ts`.
- [x] T024 [US3] Implementar `CycleSlideOver.vue` cumpliendo UI: Botón X de cerrado explícito, placeholders y atributos `max`/`count`.
- [x] T025 [US3] Implementar `WeeksMatrix.vue` aplicando Optimistic UI para el toggle de las semanas.
- [x] T026 [US3] Consolidar vistas usando el composable `useTableData` asegurando que reciba estrictamente UN solo parámetro.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Ejecutar Linter y Prettier en ambos repositorios (`backend-nestjs` y `frontend-vue`).
- [ ] T028 Ejecutar `npm run build:icons` si se añadieron nuevos íconos de Remix Icons.
- [ ] T029 Ejecutar todos los tests unitarios localmente (`pnpm vitest run` y `npm run test`) para garantizar cobertura.

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: Bloquea todo. Las tablas deben existir.
- **US2 (Cron Job)**: Debe construirse de inmediato para poblar la BD local y permitir que US1 (Catálogos) tenga data con la que trabajar.
- **US1 y US3**: Pueden construirse en paralelo una vez completada la fase 1. Sus componentes frontend pueden arrancar inmediatamente gracias a Vitest (haciendo mocks de la API).

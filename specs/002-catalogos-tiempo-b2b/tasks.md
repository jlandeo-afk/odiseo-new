# Tasks: Catálogos Simplificados y Gestión del Tiempo Académico

**Input**: Design documents from `/specs/002-catalogos-tiempo-b2b/`

**Prerequisites**: Spec 001 (Fundamentos) must be completed — auth, multi-tenant, and database infrastructure required.

**Organization**: Vertical Slicing by user story. TDD: tests before implementation. Parallel tasks marked [P].

## Format: `[ID] [P?] [Story?] Description`

## Phase 1: Setup

**Purpose**: Dependencias y configuración base para este módulo.

- [ ] T001 Install `@nestjs/sqs` and `@aws-sdk/client-sqs` in `backend-nestjs/package.json`
- [ ] T002 [P] Configure SQS queue `odiseo-catalog-sync` and DLQ `odiseo-catalog-sync-dlq` with `maxReceiveCount = 3` in `backend-nestjs/src/aws/aws.module.ts`

## Phase 2: Foundational (Entities & Repositories)

**Purpose**: Entidades y abstracciones de repositorio compartidas.

- [ ] T003 Create/update TypeORM entities `Course`, `Topic`, `Subtopic` in `backend-nestjs/src/catalogs/entities/` — ensure `Topic` has `localAlias` (nullable), `Subtopic` does NOT have `localAlias`
- [ ] T004 [P] Create/update TypeORM entities `Cycle` and `CycleWeek` in `backend-nestjs/src/academic-time/entities/` with fields: `startDate`, `endDate` (auto), `daysPerWeek`, `totalWeeks`, `weekNumber`
- [ ] T005 Update `ICatalogRepository` interface in `backend-nestjs/src/catalogs/repositories/i-catalog.repository.ts` — remove any subtopic alias methods, ensure `upsertTopicsFromCore` uses Raw SQL
- [ ] T006 [P] Create `IAcademicTimeRepository` interface in `backend-nestjs/src/academic-time/repositories/i-academic-time.repository.ts` with methods: `createCycleWithWeeks`, `getActiveCycles`, `updateWeekStatus`, prohibit `deleteWeek`

## Phase 3: User Story 1 — Gestión de Alias y Visibilidad (P1)

**Goal**: Admin puede editar alias de topics y togglear visibilidad.

**Independent Test**: PATCH topic → localAlias updated, coreName intact. Subtopics have no PATCH.

- [ ] T007 [US1] Write unit test for `CatalogUseCase` in `backend-nestjs/src/catalogs/catalog.use-case.spec.ts` — extend existing tests: test that `getUIHierarchy` filters inactive topics, subtopics inherit parent inactivity (EC-001), `updateTopicLocalInfo` delegates to repository
- [ ] T008 [US1] Update `CatalogUseCase` in `backend-nestjs/src/catalogs/catalog.use-case.ts` — implement EC-001 (inactive parent hides subtopics), verify no subtopic update methods exist
- [ ] T009 [US1] Update `CatalogController` in `backend-nestjs/src/catalogs/catalogs.controller.ts` — add `PATCH /catalogs/topics/:id` per contract, ensure NO endpoint exists for subtopic editing
- [ ] T010 [P] [US1] Build `CatalogTable` component in `frontend-vue/src/features/catalogs/components/CatalogTable.vue` — hiper-compact data-density table with inline alias editing for topics only, subtopics displayed as read-only, Optimistic UI with rollback
- [ ] T011 [P] [US1] Implement catalogs Pinia store in `frontend-vue/src/features/catalogs/store/index.ts` with Optimistic UI mutations for alias and visibility toggle

## Phase 4: User Story 2 — Sincronización SQS (P1)

**Goal**: Consumer SQS inserta/actualiza topics preservando alias locales.

**Independent Test**: Enviar payload SQS → coreName updated, localAlias intact.

- [ ] T012 [US2] Write unit test for `SqsCatalogConsumer` in `backend-nestjs/src/catalogs/sqs-catalog.consumer.spec.ts` — test event parsing, upsert call, DLQ fallback
- [ ] T013 [US2] Implement `CatalogRepositoryImpl.upsertTopicsFromCore()` in `backend-nestjs/src/catalogs/repositories/catalog.repository.ts` with Raw SQL `INSERT ON CONFLICT DO UPDATE SET core_name = EXCLUDED.core_name`
- [ ] T014 [US2] Update `SqsCatalogConsumer` in `backend-nestjs/src/catalogs/sqs-catalog.consumer.ts` to handle `TopicCreated` and `TopicUpdated` events, delegating to repository
- [ ] T015 [US2] Write E2E test in `backend-nestjs/test/catalog.e2e-spec.ts` — insert topic with alias, simulate SQS update, verify coreName changed but localAlias preserved

## Phase 5: User Story 3 — Tiempo Académico (P1)

**Goal**: Admin crea ciclos con semanas auto-generadas, soft-delete de semanas.

**Independent Test**: POST cycle → N weeks generated with calculated dates. DELETE week → 405.

- [ ] T016 [US3] Write unit test for `AcademicTimeUseCase` in `backend-nestjs/src/academic-time/academic-time.use-case.spec.ts` — test cycle creation with week generation, date calculation, week deactivation, DELETE rejection
- [ ] T017 [US3] Implement `AcademicTimeUseCase` in `backend-nestjs/src/academic-time/academic-time.use-case.ts` — `createCycle()` calculates `endDate`, generates N `CycleWeek` records with sequential dates; `deactivateWeek()` sets `isActive = false`; `deleteWeek()` throws 405
- [ ] T018 [US3] Implement `AcademicTimeRepositoryImpl` in `backend-nestjs/src/academic-time/repositories/academic-time.repository.ts`
- [ ] T019 [US3] Update `AcademicTimeController` in `backend-nestjs/src/academic-time/academic-time.controller.ts` per contracts — POST cycles, GET cycles, PATCH weeks, DELETE weeks returns 405
- [ ] T020 [P] [US3] Build `CycleSlideOver` component in `frontend-vue/src/features/academic-time/components/CycleSlideOver.vue` — Slide-over (not modal) for cycle creation with inputs: name, startDate, totalWeeks, daysPerWeek
- [ ] T021 [P] [US3] Build `WeeksMatrix` component in `frontend-vue/src/features/academic-time/components/WeeksMatrix.vue` — fluid grid with auto-animate, week deactivation via Optimistic UI toggle
- [ ] T022 [US3] Implement academic-time Pinia store in `frontend-vue/src/features/academic-time/store/index.ts`

## Phase 6: Frontend Pages & Integration

- [ ] T023 [P] Build catalogs page in `frontend-vue/src/pages/catalogs/index.vue` importing CatalogTable with Command Palette search
- [ ] T024 [P] Build academic-time page in `frontend-vue/src/pages/academic-time/index.vue` importing WeeksMatrix and CycleSlideOver

## Phase 7: Polish & Validation

- [ ] T025 Run all backend unit tests and E2E tests for catalogs and academic-time modules
- [ ] T026 [P] Run frontend unit tests for catalogs and academic-time stores

## Dependencies

```
Spec 001 Complete
  └── Phase 1 (Setup: T001-T002)
       └── Phase 2 (Foundational: T003-T006)
            ├── Phase 3 (US1: Catalogs — T007-T011)
            ├── Phase 4 (US2: SQS Sync — T012-T015)
            └── Phase 5 (US3: Academic Time — T016-T022)
                 └── Phase 6 (Pages: T023-T024)
                      └── Phase 7 (Polish: T025-T026)
```

## Implementation Strategy

**MVP Scope**: Phases 1-3 (Setup + Foundation + US1 Catalogs). Provee la vista de taxonomía funcional.

**TDD Flow**: Tests (T007, T012, T016) se escriben ANTES de la implementación correspondiente.

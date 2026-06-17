# Tasks: Gestión de Sílabos

**Input**: Design documents from `/specs/003-gestion-silabos/`
**Prerequisites**: Spec 002 (Catálogos y Tiempo) must be completed.
**Organization**: Vertical Slicing by user story. TDD.

## Phase 1: Foundational

- [ ] T001 Create TypeORM entities `Syllabus` and `SyllabusDistribution` in `backend-nestjs/src/syllabus/entities/` with constraints: UNIQUE composite, CHECK quantity > 0
- [ ] T002 Create `ISyllabusRepository` interface in `backend-nestjs/src/syllabus/repositories/i-syllabus.repository.ts`
- [ ] T003 Create `SyllabusModule` in `backend-nestjs/src/syllabus/syllabus.module.ts`

## Phase 2: User Story 1 — Creación de Sílabo (P1)

- [ ] T004 [US1] Write unit test for `SyllabusUseCase.create()` in `backend-nestjs/src/syllabus/syllabus.use-case.spec.ts` — test creation, duplicate warning (EC-003), inactive cycle rejection
- [ ] T005 [US1] Implement `SyllabusUseCase` in `backend-nestjs/src/syllabus/syllabus.use-case.ts`
- [ ] T006 [US1] Implement `SyllabusRepositoryImpl` in `backend-nestjs/src/syllabus/repositories/syllabus.repository.ts`
- [ ] T007 [US1] Create DTOs in `backend-nestjs/src/syllabus/dto/`
- [ ] T008 [US1] Create `SyllabusController` in `backend-nestjs/src/syllabus/syllabus.controller.ts` per contract

## Phase 3: User Story 2 — Distribución por Semana (P1)

- [ ] T009 [US2] Write unit test for distribution CRUD in `SyllabusUseCase` — test add, update quantity, delete, inactive week rejection (FR-003)
- [ ] T010 [US2] Implement distribution CRUD methods in `SyllabusUseCase` and repository
- [ ] T011 [US2] Add distribution endpoints to `SyllabusController`: POST, PATCH, DELETE distributions
- [ ] T012 [P] [US2] Build `SyllabusDistributionMatrix` component in `frontend-vue/src/features/syllabus/components/SyllabusDistributionMatrix.vue` — weeks × topics matrix, inline quantity editing, Optimistic UI
- [ ] T013 [P] [US2] Implement syllabus Pinia store in `frontend-vue/src/features/syllabus/store/index.ts`

## Phase 4: User Story 3 — Vista Resumen (P2)

- [ ] T014 [US3] Implement `getSummary()` in `SyllabusUseCase` — calculate totals per week and per topic
- [ ] T015 [US3] Add `GET /syllabus/:id/summary` endpoint to controller
- [ ] T016 [P] [US3] Build summary view in `SyllabusDistributionMatrix` with totals row/column

## Phase 5: Pages & Polish

- [ ] T017 Build syllabus page in `frontend-vue/src/pages/syllabus/index.vue`
- [ ] T018 [P] Build `SyllabusSlideOver` component for syllabus creation
- [ ] T019 Run all tests — backend unit + E2E, frontend unit

## Dependencies

```
Spec 002 Complete
  └── Phase 1 (T001-T003)
       └── Phase 2 (US1: T004-T008)
            └── Phase 3 (US2: T009-T013)
                 └── Phase 4 (US3: T014-T016)
                      └── Phase 5 (T017-T019)
```

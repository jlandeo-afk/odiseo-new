# Tasks: Gestión de Sílabos

**Input**: Design documents from `/specs/003-gestion-silabos/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/syllabus-api.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize syllabus module in backend-nestjs/src/syllabus/syllabus.module.ts
- [x] T002 Initialize syllabus pinia store in frontend-vue/src/features/syllabus/store/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T003 Create `Syllabus` entity in backend-nestjs/src/syllabus/entities/syllabus.entity.ts
- [x] T004 Create `SyllabusDistribution` entity in backend-nestjs/src/syllabus/entities/syllabus-distribution.entity.ts with UNIQUE composite and CHECK <= 100 constraint
- [x] T005 [P] Implement `ISyllabusRepository` and `SyllabusRepositoryImpl` in backend-nestjs/src/syllabus/repositories/
- [x] T006 Implement base `SyllabusController` routing in backend-nestjs/src/syllabus/syllabus.controller.ts
- [x] T007 Configure DTOs for creation and distribution in backend-nestjs/src/syllabus/dto/

---

## Phase 3: User Story 1 - Creación y Configuración de Sílabo (Priority: P1) 🎯 MVP

**Goal**: Permitir al coordinador académico crear un sílabo para un curso y ciclo.

**Independent Test**: Creación de un sílabo vinculado al ciclo "2026-I". Verificación de persistencia.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement `SyllabusUseCase.create()` in backend-nestjs/src/syllabus/syllabus.use-case.ts with validation (EC-003 duplicate warning)
- [x] T009 [US1] Add `POST /syllabus` endpoint to backend-nestjs/src/syllabus/syllabus.controller.ts
- [x] T010 [P] [US1] Build `SyllabusSlideOver` creation component in frontend-vue/src/features/syllabus/components/SyllabusSlideOver.vue
- [x] T011 [US1] Integrate store action to create syllabus in frontend-vue/src/features/syllabus/store/index.ts
- [x] T012 [US1] Build initial syllabus page in frontend-vue/src/pages/syllabus/index.vue

---

## Phase 4: User Story 2 - Distribución de Contenido por Semana (Priority: P1)

**Goal**: Asignar temas y subtemas a cada semana del sílabo, con cantidad de preguntas.

**Independent Test**: Asignación de topic/subtopic a semana 3. Actualización de cantidad (máximo 100). Eliminación.

### Tests for User Story 2

- [x] T013 [P] [US2] Write unit test for distribution CRUD in backend-nestjs/src/syllabus/syllabus.use-case.spec.ts testing inactive week rejection and 100 limit.

### Implementation for User Story 2

- [x] T014 [US2] Implement distribution CRUD (add, update quantity, delete) in backend-nestjs/src/syllabus/syllabus.use-case.ts
- [x] T015 [US2] Add endpoints (`POST /syllabus/:id/distribution`, `PATCH`, `DELETE`) to backend-nestjs/src/syllabus/syllabus.controller.ts
- [x] T016 [P] [US2] Build `SyllabusDistributionMatrix` component in frontend-vue/src/features/syllabus/components/SyllabusDistributionMatrix.vue
- [x] T017 [US2] Implement Optimistic UI with rollback and Cross-Route Toast on failure in frontend-vue/src/features/syllabus/store/index.ts
- [x] T018 [US2] Integrate Matrix into syllabus page frontend-vue/src/pages/syllabus/index.vue

---

## Phase 5: User Story 3 - Visualización Resumen del Sílabo (Priority: P2)

**Goal**: Ver un resumen consolidado del sílabo completo con totales por semana y por tema.

**Independent Test**: Vista resumen muestra matriz de semanas × temas con totales calculados correctamente.

### Implementation for User Story 3

- [x] T019 [P] [US3] Implement `getSummary()` in backend-nestjs/src/syllabus/syllabus.use-case.ts calculating totals
- [x] T020 [US3] Add `GET /syllabus/:id/summary` endpoint to backend-nestjs/src/syllabus/syllabus.controller.ts
- [x] T021 [P] [US3] Implement summary view logic and totals row/column in frontend-vue/src/features/syllabus/components/SyllabusDistributionMatrix.vue
- [x] T022 [US3] Add store action for fetching summary in frontend-vue/src/features/syllabus/store/index.ts

---

## Phase 6: User Story 4 - Clonación de Sílabo (Priority: P2)

**Goal**: Clonar un sílabo existente de un ciclo anterior hacia el ciclo actual.

**Independent Test**: Clonar sílabo. Si el destino tiene datos, mostrar advertencia antes de sobrescribir.

### Implementation for User Story 4

- [x] T023 [P] [US4] Implement `cloneSyllabus()` in backend-nestjs/src/syllabus/syllabus.use-case.ts (ignoring weeks out of bounds)
- [x] T024 [US4] Add `POST /syllabus/:id/clone` endpoint to backend-nestjs/src/syllabus/syllabus.controller.ts
- [x] T025 [P] [US4] Build Cloning confirmation dialog ("Existen datos previos") in frontend-vue/src/features/syllabus/components/SyllabusCloneModal.vue
- [x] T026 [US4] Integrate cloning action in frontend-vue/src/features/syllabus/store/index.ts and page.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T027 [P] Implement EC-005: Visual Warning if modifying a week that already has generated materials in frontend-vue/src/features/syllabus/components/SyllabusDistributionMatrix.vue
- [x] T028 Run quickstart.md validation scenarios to ensure 100 limit and Creation work.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: US1 depends on Phase 2. US2 depends on US1. US3 depends on US2. US4 depends on US2.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Entities creation and repository interfaces can be done in parallel (Phase 2).
- API Endpoints (backend) and Store Actions / UI Components (frontend) can be built in parallel within their respective user stories.
- US3 and US4 can be built in parallel once US2 is complete.

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Test US1 and US2 independently using quickstart.md
6. Deploy MVP.

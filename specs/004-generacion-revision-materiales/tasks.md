# Tasks: Generación y Revisión de Materiales PDF

**Input**: Design documents from `/specs/004-generacion-revision-materiales/`

**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/, research.md

**Organization**: Las tareas están agrupadas en fases estructuradas: Setup inicial, Prerrequisitos Fundacionales, e Historias de Usuario individuales para permitir la implementación e integración incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos independientes, sin dependencias previas bloqueantes).
- **[Story]**: A qué historia de usuario pertenece (ej. US1, US2, US3, US4).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del módulo de materiales y configuraciones iniciales.

- [ ] T001 Configure NestJS modules, imports and structure for materials in backend-nestjs/src/materials/materials.module.ts
- [ ] T002 Configure AWS SDK client configurations for SQS and S3 in backend-nestjs/src/config/aws.config.ts
- [ ] T003 Configure Python environment, FastAPI routing, and SQS listener configuration in worker-fastapi/src/config.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estructura de base de datos y entidades comunes necesarias antes de comenzar las historias.

**⚠️ CRITICAL**: Ningún desarrollo de historias de usuario puede comenzar sin haber completado estas tareas.

- [ ] T004 Create TypeORM entity `MaterialRequest` in backend-nestjs/src/materials/entities/material-request.entity.ts
- [ ] T005 [P] Create TypeORM entity `MaterialRequestCourse` in backend-nestjs/src/materials/entities/material-request-course.entity.ts
- [ ] T006 [P] Create TypeORM entity `MaterialReviewQuestion` in backend-nestjs/src/materials/entities/material-review-question.entity.ts
- [ ] T007 Create database migrations for the new materials tables in backend-nestjs/src/migrations/
- [ ] T008 [P] Implement MaterialsRepository in backend-nestjs/src/materials/repositories/materials.repository.ts and its interface i-materials.repository.ts
- [ ] T009 Create base FastAPI Worker schemas for SQS payload handling in worker-fastapi/src/schemas/material.py

**Checkpoint**: Base de datos e infraestructura común listas. Se puede iniciar el desarrollo de las historias.

---

## Phase 3: User Story 1 - Solicitud de Generación (Priority: P1) 🎯 MVP

**Goal**: El administrador solicita generar un material. El backend NestJS calcula la distribución temática del sílabo, persiste registros PENDING de la solicitud y sus cursos, y encola la extracción inicial en AWS SQS.

**Independent Test**: Curl POST a `/api/v1/materials/generate` con perfil y semana. Validar HTTP 202 Accepted, inserción en `material_requests` y `material_request_courses` con estado `PENDING`, y envío del payload correcto a la cola SQS.

### Implementation for User Story 1

- [ ] T010 [US1] Create request DTO `GenerateMaterialDto` in backend-nestjs/src/materials/dto/generate-material.dto.ts
- [ ] T011 [US1] Implement core logic in `MaterialsService.generate()` in backend-nestjs/src/materials/materials.service.ts to fetch profile, cross with syllabus weeks, persist `MaterialRequest` and `MaterialRequestCourse` records, and dispatch SQS message
- [ ] T012 [US1] Implement controller endpoint `POST /api/v1/materials/generate` in backend-nestjs/src/materials/materials.controller.ts
- [ ] T013 [P] [US1] Build generation UI modal `MaterialGenerateModal.vue` in frontend-vue/src/features/materials/components/MaterialGenerateModal.vue
- [ ] T014 [US1] Write unit tests for `MaterialsService.generate()` in backend-nestjs/src/materials/materials.service.spec.ts

**Checkpoint**: Flujo de solicitud y encolado funcional de punta a punta.

---

## Phase 4: User Story 2 - Procesamiento por el Worker (Priority: P1)

**Goal**: El Worker FastAPI consume de SQS, extrae reactivos del Core API con reintentos automáticos de backoff, y compila los PDFs de los cursos (o ZIP por áreas) subiéndolos a S3 y actualizando el estado de la solicitud en NestJS.

**Independent Test**: Mockear mensaje SQS, validar que el Worker ejecuta llamadas HTTP al Core API (manejando fallos ficticios hasta 3 veces), compila con WeasyPrint usando el logo del tenant, sube a S3 y notifica mediante callback HTTP al SaaS.

### Implementation for User Story 2

- [ ] T015 [US2] Implement Core API client service in worker-fastapi/src/services/core_api_client.py with 3-attempt backoff retry logic for timeouts/network issues
- [ ] T016 [US2] Implement extraction logic in worker-fastapi/src/handlers/extraction_handler.py to fetch questions, evaluate shortages, and handle `REVIEW_REQUIRED` state
- [ ] T017 [US2] Implement PDF compiler using WeasyPrint in worker-fastapi/src/services/weasyprint_compiler.py with HTML templates supporting tenant branding
- [ ] T018 [US2] Implement S3 upload and metadata update in worker-fastapi/src/services/s3_service.py
- [ ] T019 [US2] Implement callback handler in worker-fastapi/src/handlers/compilation_handler.py to call SaaS callback API when compilation completes or fails
- [ ] T020 [US2] Create webhook callback endpoint in NestJS backend-nestjs/src/materials/materials.controller.ts to receive status updates (`COMPLETED`, `FAILED`, etc.) from the Worker
- [ ] T021 [US2] Write unit tests for `weasyprint_compiler.py` and `core_api_client.py` in worker-fastapi/tests/

**Checkpoint**: El Worker procesa, compila, sube a S3 y reporta el estado al SaaS exitosamente de forma asíncrona.

---

## Phase 5: User Story 3 - Revisión de Material (Priority: P1)

**Goal**: El administrador visualiza las preguntas extraídas y los vacíos en la UI. Al ingresar, el material pasa a `IN_REVIEW` con bloqueo optimista. El administrador puede aprobar, omitir vacíos o reemplazar reactivos en la distribución inmutable.

**Independent Test**: Consultar `/review` de un material y verificar transición a `IN_REVIEW`. Comprobar que una segunda consulta concurrente retorna HTTP 409. Llamar a `/approve` enviando reemplazos lógicos y validar que el material avanza a `PROCESSING` y encola la compilación final.

### Implementation for User Story 3

- [ ] T022 [US3] Implement `GET /api/v1/materials/:id/review` in backend-nestjs/src/materials/materials.controller.ts which returns questions and updates status to `IN_REVIEW`
- [ ] T023 [US3] Implement optimistic locking check in backend-nestjs/src/materials/materials.service.ts for when status is `IN_REVIEW`
- [ ] T024 [US3] Create DTO `ApproveReviewDto` in backend-nestjs/src/materials/dto/approve-review.dto.ts for replacements and removals
- [ ] T025 [US3] Implement `POST /api/v1/materials/:id/approve` in backend-nestjs/src/materials/materials.controller.ts to update questions and trigger final compilation via SQS
- [ ] T026 [P] [US3] Build review UI component `MaterialReviewList.vue` in frontend-vue/src/features/materials/components/MaterialReviewList.vue
- [ ] T027 [P] [US3] Build review page in frontend-vue/src/pages/materials/[id]/review.vue wrapping the review component
- [ ] T028 [US3] Write unit tests for review and approval endpoints in backend-nestjs/src/materials/materials.service.spec.ts

**Checkpoint**: El flujo de curaduría, bloqueo optimista y aprobación manual de vacíos/reemplazos funciona de forma robusta.

---

## Phase 6: User Story 4 - Notificación en Tiempo Real y Descargas (Priority: P1)

**Goal**: El cliente recibe notificaciones en tiempo real vía WebSocket al culminar la generación. Se habilitan enlaces de descarga pre-firmados de S3 con 24 horas de expiración que se re-firman transparentemente en el backend.

**Independent Test**: Capturar evento WebSocket en el frontend al terminar de generar. Verificar toast de aviso. Hacer clic en descargar, validar llamada a `/download` que entrega el presigned URL fresco (vigencia 24h) y comprobar acceso exitoso al PDF en S3.

### Implementation for User Story 3

- [ ] T029 [US4] Implement WebSocket event listeners and state management in frontend-vue/src/features/materials/store/materials.ts using AWS API Gateway WebSockets
- [ ] T030 [US4] Implement NestJS endpoint `GET /api/v1/materials/:id/courses/:courseId/download` in backend-nestjs/src/materials/materials.controller.ts which returns a fresh S3 presigned URL (24h expiration)
- [ ] T031 [P] [US4] Build status UI card `MaterialStatusCard.vue` in frontend-vue/src/features/materials/components/MaterialStatusCard.vue
- [ ] T032 [P] [US4] Build the history and list page in frontend-vue/src/pages/materials/index.vue
- [ ] T033 [US4] Write unit tests for the download endpoint in backend-nestjs/src/materials/materials.service.spec.ts

**Checkpoint**: Flujo de notificaciones y descargas granulares por curso completamente operativo.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Estabilización, documentación y pruebas de regresión.

- [ ] T034 Perform clean-up, TypeScript compilation validation, and ESLint checks across backend and frontend
- [ ] T035 [P] Document environment variables and setup details in specs/004-generacion-revision-materiales/quickstart.md
- [ ] T036 Run end-to-end local validation scenarios using LocalStack per quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

```
[Phase 1: Setup]
       │
       ▼
[Phase 2: Foundational] (Blocks all User Stories)
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[Phase 3: User Story 1] (SaaS Request)    [Phase 4: User Story 2] (Worker PDF)
       │                                         │
       └──────────────────┬──────────────────────┘
                          ▼
               [Phase 5: User Story 3] (SaaS Review Flow)
                          │
                          ▼
               [Phase 6: User Story 4] (WS Notifications & S3 Downloads)
                          │
                          ▼
               [Phase 7: Polish & E2E Validation]
```

---

## Parallel Example: User Story 1

Para optimizar el tiempo de desarrollo, una vez finalizada la Fase 2, se pueden paralelizar las siguientes tareas:

```bash
# Desarrollo en el Frontend (UI de Solicitud):
Task: "Build generation UI modal MaterialGenerateModal.vue in frontend-vue/src/features/materials/components/MaterialGenerateModal.vue"

# Desarrollo en el Backend (Lógica de negocio e Integración SQS):
Task: "Create request DTO GenerateMaterialDto in backend-nestjs/src/materials/dto/generate-material.dto.ts"
Task: "Implement core logic in MaterialsService.generate() in backend-nestjs/src/materials/materials.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 sin revisión)
1. Completar **Phase 1 (Setup)** y **Phase 2 (Foundational)**.
2. Implementar **Phase 3 (User Story 1)** modificando `requiresReview = false` por defecto.
3. Implementar **Phase 4 (User Story 2)** omitiendo el paso intermedio.
4. **Validación MVP:** Probar generación directa de PDF por curso en LocalStack y verificar subida correcta.

### Entrega Incremental
1. Añadir el flujo intermedio de revisión (**Phase 5: User Story 3**) con la lógica `IN_REVIEW`.
2. Acoplar notificaciones por WebSocket y descargas temporales (**Phase 6: User Story 4**).
3. Completar con pruebas unitarias, documentación y pulido general (**Phase 7**).

---

## Done When

- [ ] `tasks.md` generado con todas las fases y IDs de tareas formateados correctamente.
- [ ] Extensiones y hooks verificados.
- [ ] Reporte de finalización enviado al usuario indicando el total de tareas y el MVP.

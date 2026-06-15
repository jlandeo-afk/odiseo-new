# Tasks: Generación de Balotario PDF

**Input**: Design documents from `/specs/001-generacion-balotario-pdf/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story, respetando el paralelismo y la atomicidad requerida.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto, dependencias clave para AWS y librerías de generación de PDF.

- [x] T001 [P] Configure SQS queue and S3 bucket in LocalStack or AWS para desarrollo local (`docker-compose.yml` u scripts auxiliares).
- [x] T002 [P] Install AWS SDK (`@aws-sdk/client-sqs`, `@aws-sdk/client-s3`) en `backend-nestjs/package.json`.
- [x] T003 [P] Install `boto3`, `fastapi`, y librerías de PDF (`pdfkit` o `reportlab`) en `worker-fastapi/requirements.txt`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Incluye integraciones bases con SQS y S3 sin la lógica de negocio.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create `GenerateMaterialJob` DTO/interface en `backend-nestjs/src/materials/dto/generate-material-job.dto.ts` basado en `data-model.md`.
- [x] T005 [P] Implement AWS SQS producer service en `backend-nestjs/src/aws/sqs.service.ts`.
- [x] T006 [P] Implement AWS S3 upload service base en `worker-fastapi/app/s3_service.py`.
- [x] T007 [P] Implement SQS consumer base loop en `worker-fastapi/app/sqs_consumer.py`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Generación Exitosa de Balotario (Priority: P1) 🎯 MVP

**Goal**: Permitir al administrador solicitar un balotario/examen, procesarlo asíncronamente (incluyendo bifurcación por áreas si es examen) y notificar la URL de S3 vía WebSocket.

**Independent Test**: Lanzar petición POST REST, observar inmediata respuesta 202, observar log del worker procesando SQS, subiendo a S3 y recibiendo el evento WebSocket simulado.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create API endpoint `POST /api/v1/materials/generate` en `backend-nestjs/src/materials/materials.controller.ts` asegurando retorno HTTP 202 síncrono.
- [x] T009 [US1] Implement `MaterialsService` en `backend-nestjs/src/materials/materials.service.ts` para extraer jerarquía de sílabo y enviar el payload a `sqs.service.ts`.
- [x] T010 [P] [US1] Implement Core API REST client en `worker-fastapi/app/core_api_client.py` para consultar reactivos.
- [x] T011 [P] [US1] Implement PDF generation logic en `worker-fastapi/app/pdf_generator.py` inyectando dinámicamente metadatos del Tenant.
- [x] T012 [US1] Implement logical segregation and booklet assembly (CR-002, CR-003) en `worker-fastapi/app/material_assembler.py` invocando el `pdf_generator` por cada `exam_area_id`.
- [x] T013 [US1] Integrate SQS consumer con el ensamblador y S3 subiendo el resultado final en `worker-fastapi/app/sqs_consumer.py`.
- [x] T014 [US1] Implement WebSocket notifier (API Gateway client) en `worker-fastapi/app/ws_notifier.py` para emitir el evento `material.generation.completed`.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Reactivos Insuficientes o Vacíos (Priority: P2)

**Goal**: Manejar el flujo de error cuando el Banco Global no posee suficientes preguntas para satisfacer los filtros de la solicitud.

**Independent Test**: Solicitar balotario con filtros restrictivos inexistentes, verificar interrupción temprana en el worker y envío del evento WebSocket `material.generation.failed`.

### Implementation for User Story 2

- [x] T015 [US2] Update `worker-fastapi/app/core_api_client.py` para detectar y validar cantidad de reactivos vs. `requested_quantity` y lanzar excepción controlada.
- [x] T016 [US2] Update `worker-fastapi/app/material_assembler.py` para abortar operación limpiamente ante la excepción.
- [x] T017 [US2] Update `worker-fastapi/app/ws_notifier.py` para capturar error en consumidor y emitir evento `material.generation.failed` con la causa.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Desconexión del WebSocket y Recuperación (Priority: P3)

**Goal**: Garantizar que el usuario pueda descargar el material si cerró su sesión durante la generación, persistiendo el estado final.

**Independent Test**: Solicitar material, cerrar sesión, esperar terminación, volver a entrar y ver el material completado en el historial de BD.

### Implementation for User Story 3

- [x] T018 [P] [US3] Create `MaterialRequest` TypeORM entity en `backend-nestjs/src/materials/entities/material-request.entity.ts`.
- [x] T019 [US3] Update `backend-nestjs/src/materials/materials.service.ts` para persistir estado "pending" antes de enviar mensaje a SQS.
- [x] T020 [P] [US3] Create internal webhook endpoint `POST /api/v1/materials/webhook/status` en `backend-nestjs/src/materials/materials.controller.ts` para recibir actualización del worker.
- [ ] T021 [US3] Update `worker-fastapi/app/sqs_consumer.py` para invocar el webhook interno notificando éxito (`download_url`) o error para actualizar la base de datos B2B.

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [ ] T022 [P] Ejecutar y validar escenarios End-to-End descritos en `quickstart.md`.
- [ ] T023 Refactorizar código del generador PDF para optimizar la inyección de estilos (CSS a PDF).
- [ ] T024 [P] Validar Clean Architecture: asegurar que `materials.controller.ts` no contenga reglas de negocio.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Secuencialmente P1 → P2 → P3, aunque partes marcadas con `[P]` pueden trabajarse paralelamente.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### Quality Gate Check

- **[FR-001/002/003]**: Formularios y asincronía → T008, T009.
- **[FR-004/005]**: Cero persistencia y consumo Core API → T010.
- **[FR-006]**: Worker ensambla y sube a S3 → T011, T006, T013.
- **[FR-007/008]**: Notificación WebSocket → T014.
- **[FR-009]**: Sílabo estructurado → T009.
- **[FR-010]**: Tenant branding → T011.
- **[CR-001/002/003]**: Partición física de cuadernillos → T012.

✅ Confirmación explícita: El 100% de los requisitos (FR y CR) especificados en `spec.md` cuentan con al menos una tarea atómica asignada y trazable.

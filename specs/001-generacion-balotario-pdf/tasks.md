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

**Goal**: Permitir al administrador solicitar un balotario/examen, procesarlo asíncronamente y notificar la URL vía WebSocket.

### Implementation for User Story 1
- [x] T008 [P] [US1] Create API endpoint `POST /api/v1/materials/generate` en `backend-nestjs/src/materials/materials.controller.ts` asegurando retorno HTTP 202 síncrono.
- [x] T009 [US1] Implement `MaterialsService` en `backend-nestjs/src/materials/materials.service.ts` para extraer jerarquía de sílabo y enviar el payload a `sqs.service.ts`.
- [x] T010 [P] [US1] Implement Core API REST client en `worker-fastapi/app/core_api_client.py` para consultar reactivos.
- [x] T011 [P] [US1] Implement PDF generation logic en `worker-fastapi/app/pdf_generator.py` inyectando dinámicamente metadatos del Tenant.
- [x] T012 [US1] Implement logical segregation and booklet assembly en `worker-fastapi/app/material_assembler.py` invocando el `pdf_generator` por cada `exam_area_id`.
- [x] T013 [US1] Integrate SQS consumer con el ensamblador y S3 subiendo el resultado final en `worker-fastapi/app/sqs_consumer.py`.
- [x] T014 [US1] Implement WebSocket notifier (API Gateway client) en `worker-fastapi/app/ws_notifier.py` para emitir el evento `material.generation.completed`.
- [ ] T015 [P] [US1] Frontend: Implement Vue.js/Nuxt frontend listener for WebSocket events en `frontend-vue/src/stores/websocket.store.ts` para capturar la URL final.
- [ ] T016 [P] [US1] Frontend Unit Tests: Escribir pruebas para el componente de recepción WebSocket en `frontend-vue/tests/unit/websocket.spec.ts`.
- [ ] T017 [P] [US1] Backend Integration Tests: Escribir pruebas RESTful para `POST /api/v1/materials/generate` en `backend-nestjs/test/materials.e2e-spec.ts`.

---

## Phase 4: User Story 2 - Reactivos Insuficientes o Vacíos (Priority: P2)

**Goal**: Manejar el flujo de error cuando el Banco Global no posee suficientes preguntas.

### Implementation for User Story 2
- [x] T018 [US2] Update `worker-fastapi/app/core_api_client.py` para detectar y validar cantidad de reactivos vs. `requested_quantity` y lanzar excepción controlada.
- [x] T019 [US2] Update `worker-fastapi/app/material_assembler.py` para abortar operación limpiamente ante la excepción.
- [x] T020 [US2] Update `worker-fastapi/app/ws_notifier.py` para capturar error en consumidor y emitir evento `material.generation.failed` con la causa.
- [ ] T021 [P] [US2] Frontend: Implement Vue.js/Nuxt empty state UI en `frontend-vue/src/components/MaterialWarning.vue` para mostrar la advertencia de falta de reactivos.
- [ ] T022 [P] [US2] Frontend Unit Tests: Escribir pruebas para el UI warning de estados vacíos en `frontend-vue/tests/unit/MaterialWarning.spec.ts`.
- [ ] T023 [P] [US2] Backend Integration Tests: Escribir pruebas RESTful simulando falla de Core API en `backend-nestjs/test/materials-failure.e2e-spec.ts`.

---

## Phase 5: User Story 3 - Desconexión del WebSocket y Recuperación (Priority: P3)

**Goal**: Garantizar que el usuario pueda descargar el material si cerró su sesión, persistiendo el estado final.

### Implementation for User Story 3
- [x] T024 [P] [US3] Create `MaterialRequest` TypeORM entity en `backend-nestjs/src/materials/entities/material-request.entity.ts`.
- [x] T025 [US3] Update `backend-nestjs/src/materials/materials.service.ts` para persistir estado "pending" antes de enviar mensaje a SQS.
- [x] T026 [P] [US3] Create internal webhook endpoint `POST /api/v1/materials/webhook/status` en `backend-nestjs/src/materials/materials.controller.ts`.
- [x] T027 [US3] Update `worker-fastapi/app/sqs_consumer.py` para invocar el webhook interno notificando éxito o error.
- [ ] T028 [P] [US3] Frontend: Implement Vue.js/Nuxt history view en `frontend-vue/src/pages/materials/history.vue` para recuperar PDFs generados offline.
- [ ] T029 [P] [US3] Frontend Unit Tests: Escribir pruebas del historial y recuperación de estado en `frontend-vue/tests/unit/history.spec.ts`.
- [ ] T030 [P] [US3] Backend Integration Tests: Escribir pruebas para el endpoint del webhook en `backend-nestjs/test/webhook.e2e-spec.ts`.

---

## Phase 6: User Story 4 - Curaduría Manual (Priority: P1)

**Goal**: Implementar la UI intermedia y operaciones de curaduría de reactivos.

- [x] T031 [P] [US4] Create RESTful endpoints en `backend-nestjs/src/materials/materials.controller.ts` para acciones de curaduría (`PUT .../remove`, `regenerate`, `complete`).
- [x] T032 [US4] Implement strict PostgreSQL `void` functions via TypeORM migrations para la actualización de estados de curaduría.
- [x] T033 [US4] Update `worker-fastapi/app/material_assembler.py` para pausar la generación física hasta recibir confirmación explícita.
- [ ] T034 [P] [US4] Frontend: Implementar las Vistas de Curaduría Manual en Vue.js/Nuxt en `frontend-vue/src/pages/materials/curation.vue`.
- [ ] T035 [P] [US4] Frontend: Implement Pinia Reactive State en `frontend-vue/src/stores/curation.store.ts` para gestionar en tiempo real las transiciones de los estados de BD (`MISSING`, `AUTO_COMPLETED`, `MANUAL_REMOVED`, `GENERATED`).
- [ ] T036 [P] [US4] Frontend Unit Tests: Escribir pruebas del flujo interactivo de curaduría manual y el manejo del store de Pinia en `frontend-vue/tests/unit/curation.spec.ts`.
- [ ] T037 [P] [US4] Backend Integration Tests: Escribir pruebas RESTful completas para los endpoints de curaduría en `backend-nestjs/test/curation.e2e-spec.ts`.
- [ ] T038 [P] [US4] Database Tests: Escribir tests (vía Jest/TypeORM DB tests o pgTAP) en `backend-nestjs/test/db/curation-functions.spec.ts` garantizando que las funciones de actualización de curaduría retornan estrictamente `void`.

---

## Phase 7: User Story 5 - Generación Automática (Cron/Scheduler) (Priority: P1)

**Goal**: Orquestar la ejecución desatendida a través de programación horaria.

- [x] T039 [P] [US5] Implement the recurrent Cron Job / worker scheduler usando `@nestjs/schedule` para disparar lotes de balotarios automáticamente.
- [x] T040 [US5] Implement `cycle_weeks` traversal logic garantizando la preservación estricta de las semanas nulas (NULL) en la base de datos B2B.
- [ ] T041 [P] [US5] Backend Integration Tests: Escribir pruebas para la correcta ejecución del iterador del cron job en `backend-nestjs/test/cron.e2e-spec.ts`.
- [ ] T042 [P] [US5] Database Tests: Escribir tests en `backend-nestjs/test/db/cycle-weeks.spec.ts` validando que el algoritmo preserve rigurosamente las semanas inactivas como registros nulos sin eliminarlas (CR-004).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [x] T043 [P] Ejecutar y validar escenarios End-to-End descritos en `quickstart.md`.
- [x] T044 Refactorizar código del generador PDF para optimizar la inyección de estilos (CSS a PDF).
- [x] T045 [P] Validar Clean Architecture: asegurar que `materials.controller.ts` no contenga reglas de negocio.
- [x] T046 [P] Implementar contratos OpenAPI/Swagger en `materials.controller.ts` para cumplir con el Estándar de Calidad IV de la Constitución.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion. Secuencialmente P1 → P2 → P3, aunque partes marcadas con `[P]` pueden trabajarse paralelamente.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### Quality Gate Check
- **Frontend / UX**: Vistas explícitas y Pinia cubiertos en T015, T021, T028, T034, T035.
- **Testing**: Pruebas unitarias frontend y pruebas de integración REST backend atómicamente por cada US (T016, T017, T022, T023, T029, T030, T036, T037, T041).
- **CR-004**: Semanas nulas intactas → T040, testeado rigurosamente en DB Tests en T042.
- **CR-005**: Funciones Postgres VOID → T032, testeado rigurosamente en DB Tests en T038.
- **Const-IV**: Contratos OpenAPI/Swagger → T046.

✅ Confirmación explícita: El 100% de las nuevas directivas de Frontend, Testing Automatizado y Pruebas de Base de Datos han sido incorporadas atómicamente, brindando cobertura total a los requerimientos de la UI en Vue.js y la validación estructural.

# Implementation Plan: Generación y Revisión de Materiales PDF

**Branch**: `004-generacion-revision-materiales` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-generacion-revision-materiales/spec.md`

## Summary

Pipeline asíncrono y distribuido para la generación de materiales educativos (prácticas, exámenes) en formato PDF por curso. El backend NestJS recibe la solicitud, consulta las reglas del perfil y la planificación del sílabo, y delega de manera asíncrona mediante BullMQ (Redis) la extracción y compilación a un Processor BullMQ en NestJS aislado. Incluye una pantalla de revisión intermedia para que los administradores aprueben, eliminen slots o busquen alternativas de preguntas inmutables antes de la compilación final.

## Technical Context

- **Language/Version**: TypeScript (NestJS 10+), 
- **Primary Dependencies**: 
  - Backend: `@aws-sdk/client-sqs`, `@aws-sdk/client-s3`, TypeORM (PostgreSQL)
  - Processor: Playwright, @nestjs/bullmq
- **Storage**: PostgreSQL 16 (Multi-tenant schema-per-tenant), Amazon S3 (Almacenamiento permanente de PDFs)
- **Testing**: Jest (SaaS backend), pytest (FastAPI worker)
- **Target Platform**: AWS ECS / App Runner para NestJS
- **Project Type**: Web Services (NestJS API + FastAPI Processor)
- **Performance Goals**: Notificación por WebSocket en menos de 2 segundos desde la finalización de la compilación en el Processor.
- **Constraints**: 24 horas de expiración para URLs pre-firmadas de S3.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Separación de Dominios**: El SaaS B2B NestJS no almacena textos ni imágenes pesadas de los reactivos; solo maneja IDs lógicos de preguntas (`question_id`). Las preguntas físicas se extraen del Core API del Banco de Preguntas.
- [x] **Asincronía Extrema**: Todo procesamiento pesado y compilación física de PDFs se delega al Processor BullMQ en NestJS mediante BullMQ (Redis) y se notifica vía AWS API Gateway WebSockets. El servidor NestJS nunca compila PDFs síncronamente.
- [x] **Convención de Nombres en Base de Datos**: Todas las tablas, columnas, índices y claves foráneas están nombradas estrictamente en inglés y en minúsculas con guiones bajos (`snake_case`):
  - `material_requests`
  - `material_request_courses`
  - `material_review_questions`
- [x] **Aislamiento Físico**: El Processor BullMQ en NestJS no se conecta a la base de datos transaccional PostgreSQL del SaaS B2B. Toda la información de configuración y marcas viaja en el payload de BullMQ o se reporta a través de endpoints HTTP.

## Project Structure

### Documentation (this feature)

```text
specs/004-generacion-revision-materiales/
├── plan.md              # Este archivo
├── research.md          # Bitácora de decisiones de diseño
├── data-model.md        # Diseño de Entidades y relaciones
├── quickstart.md        # Guía de validación
├── contracts/           # Contratos de Interfaces (API y WS)
│   ├── api-generate-material.md
│   └── ws-notification.md
└── tasks.md             # Plan de tareas de desarrollo
```

### Source Code (repository root)

```text
backend-nestjs/
├── src/
│   ├── materials/
│   │   ├── materials.controller.ts
│   │   ├── materials.module.ts
│   │   ├── materials.service.ts
│   │   ├── entities/
│   │   │   ├── material-request.entity.ts
│   │   │   ├── material-request-course.entity.ts
│   │   │   └── material-review-question.entity.ts
│   │   ├── repositories/
│   │   │   ├── i-materials.repository.ts
│   │   │   └── materials.repository.ts
│   │   └── dto/
│   │       ├── generate-material.dto.ts
│   │       └── approve-review.dto.ts

worker-fastapi/
├── src/
│   ├── main.py
│   ├── config.py
│   ├── handlers/
│   │   ├── extraction_handler.py
│   │   └── compilation_handler.py
│   ├── services/
│   │   ├── core_api_client.py
│   │   ├── s3_service.py
│   │   ├── sqs_service.py
│   │   └── weasyprint_compiler.py
│   └── templates/
│       └── base_material.html

frontend-vue/
├── src/
│   ├── features/
│   │   └── materials/
│   │       ├── components/
│   │       │   ├── MaterialReviewList.vue
│   │       │   ├── MaterialStatusCard.vue
│   │       │   └── MaterialGenerateModal.vue
│   │       └── store/
│   │           └── materials.ts
│   └── pages/
│       └── materials/
│           ├── index.vue
│           └── [id]/
│               └── review.vue
```

**Structure Decision**: Se mantiene una arquitectura de microservicios limpia:
- El backend NestJS actúa como orquestador API de cara al cliente y persiste el estado de auditoría/revisión en PostgreSQL.
- El Processor BullMQ en NestJS corre aislado escuchando BullMQ para realizar el trabajo pesado.
- El frontend en Vue consume la API del SaaS y reacciona en tiempo real mediante WebSocket.

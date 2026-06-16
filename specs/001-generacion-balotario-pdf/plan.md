# Implementation Plan: Generación de Balotario PDF

**Branch**: `001-generacion-balotario-pdf` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-generacion-balotario-pdf/spec.md`

## Summary

Implementación de la generación asíncrona de balotarios y exámenes en PDF. El SaaS B2B delegará la compilación pesada de los documentos hacia un worker aislado a través de Amazon SQS, el cual ensamblará el PDF (segregando en cuadernillos independientes si es un examen) consultando al Core API y notificará pasivamente al usuario mediante WebSockets cuando el documento esté listo en Object Storage.

## Technical Context

**Language/Version**: TypeScript (NestJS / Nuxt 3), Python 3.11 (FastAPI Worker)
**Primary Dependencies**: Tailwind CSS, Shadcn-Vue/Nuxt UI, Pinia, AWS SDK (SQS, S3), WebSocket Gateway, PDF Generation Lib (FastAPI)
**Storage**: PostgreSQL (B2B SaaS y Core API), Amazon S3 (Object Storage)
**Testing**: Jest (NestJS), Pytest (FastAPI Worker)
**Target Platform**: AWS Fargate (Worker), AWS API Gateway
**Project Type**: Web Service (SaaS API) + Microservices (Background Worker)
**Performance Goals**: <500ms UI release, real-time WebSocket notification (<1s post-generation)
**Constraints**: Asincronía extrema, separación estricta de dominios (cero almacenamiento local de reactivos en SaaS B2B), segregación estricta de cuadernillos por área de evaluación en exámenes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Separación de Dominios**: El B2B NestJS NUNCA guarda reactivos. Solo gestiona la petición inicial y delega `question_id`s y parámetros al worker.
- [x] **Asincronía Extrema**: NestJS delega la petición a SQS y libera el hilo principal (HTTP 202) de inmediato.
- [x] **Tech Stack**: Se cumple la orquestación SQS + ECS Fargate para el cómputo aislado intensivo de PDFs.
- [x] **Antipatrones Evitados**: Cero compilación síncrona en microservicios del SaaS B2B.

## Clean Architecture en Vue (Frontend)

El frontend B2B adoptará una Clean Architecture estricta:
1. **Capa UI (Components/Pages)**: Componentes "tontos" construidos con Tailwind CSS y Shadcn-Vue/Nuxt UI. No contienen lógica de negocio, solo emiten eventos y reciben props.
2. **Capa de Dominio/Estado (Pinia/Composables)**: Contiene la lógica de negocio, consumos a la API, hidratación de roles (Spatie), y manejo de errores. Separa completamente la vista de los datos.

## Architecture Flow

0. **Autenticación y Aislamiento B2B**:
   - El usuario accede al subdominio (ej. `colegio.odiseo.com`). El frontend consulta la tabla `clientes_empresas` para resolver el branding visual.
   - El login emite credenciales; el backend cruza la tabla `users` para garantizar que el `company_id` coincide con el del entorno actual (aislamiento estricto).
   - Se devuelve la sesión y Nuxt hidrata el estado con los roles y permisos del usuario provenientes de Spatie (`roles`, `permissions`).

1. **Request (SaaS B2B - NestJS)**:
   - El admin solicita generar un material o examen a través de la API REST.
   - NestJS deriva el Payload exacto consultando la jerarquía de planificación/sílabo en la base de datos (cantidades exactas por tema/subtema).
   - NestJS envía el evento estructurado JSON a una cola **Amazon SQS**, inyectando los metadatos visuales del Tenant.
   - NestJS retorna HTTP 202 Accepted de inmediato (liberando la UI).

2. **Background Processing (Worker FastAPI - AWS Fargate)**:
   - Fargate Worker consume asíncronamente el mensaje de SQS.
   - Ejecuta consultas HTTP al **Core API (Python)** solicitando estrictamente las preguntas requeridas según el Payload.
   - *Lógica Estructural de Exámenes*: Si la petición es de tipo `EXAMEN`, el worker iterará sobre los `exam_area_id` recibidos, separando internamente las solicitudes y ensamblando **cuadernillos físicos/lógicos independientes** (Área A, Área B, Área C).
   - Ensambla el/los archivo(s) PDF inyectando dinámicamente el logo y metadatos del Tenant.
   - Sube los PDFs resultantes a **Amazon S3**.

3. **Notification (AWS API Gateway WebSockets)**:
   - Una vez asegurados los archivos en S3, el Worker invoca AWS API Gateway (vía evento o endpoint interno).
   - AWS API Gateway emite un mensaje en tiempo real mediante WebSockets a la conexión persistente del Tenant Admin.
   - El Frontend capta el evento y muestra la alerta con la URL pre-firmada de descarga.

## Project Structure

### Documentation (this feature)

```text
specs/001-generacion-balotario-pdf/
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── api-generate-material.md
    └── ws-notification.md
```

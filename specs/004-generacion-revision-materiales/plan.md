# Implementation Plan: Generación y Revisión de Materiales PDF

**Branch**: `004-generacion-revision-materiales` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

## Summary

Pipeline asíncrono de generación de materiales educativos (balotarios/exámenes) en PDF. El Backend NestJS lee la distribución del sílabo, envía payload a SQS, el Worker FastAPI procesa (Core API → WeasyPrint PDF → S3), y notifica via WebSocket. Incluye vista de revisión (ex-curaduría) para gestionar preguntas antes del PDF final.

## Technical Context

**Language/Version**: TypeScript (NestJS), Python 3.11 (FastAPI Worker)
**Primary Dependencies**: Backend: `@aws-sdk/client-sqs`, `@aws-sdk/client-s3`, TypeORM. Worker: FastAPI, WeasyPrint, boto3.
**Storage**: PostgreSQL 16, S3 for PDFs
**External**: Amazon SQS, S3, API Gateway WebSockets, Core API (Banco de Preguntas)

## Constitution Check

- [x] **Separación de Dominios**: Worker consulta Core API para preguntas, SaaS solo orquesta. ✅
- [x] **Asincronía Extrema**: SQS + Worker + WebSocket. ✅
- [x] **Anti-patrón síncrono**: PDF NUNCA se genera en el backend NestJS. ✅

## Project Structure

```text
backend-nestjs/src/materials/
├── materials.controller.ts
├── materials.module.ts
├── materials.use-case.ts
├── entities/
│   ├── material-request.entity.ts
│   └── material-review-question.entity.ts
├── repositories/
│   ├── i-materials.repository.ts
│   └── materials.repository.ts
└── dto/

worker-fastapi/
├── src/
│   ├── sqs_consumer.py
│   ├── material_assembler.py
│   ├── pdf_generator.py
│   ├── s3_uploader.py
│   └── ws_notifier.py

frontend-vue/src/features/materials/
├── components/
│   ├── GenerateForm.vue
│   ├── MaterialReview.vue
│   └── MaterialStatus.vue
├── store/index.ts
└── pages/
    ├── index.vue
    └── review.vue
```

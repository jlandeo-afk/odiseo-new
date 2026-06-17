# Implementation Plan: Catálogos Simplificados y Gestión del Tiempo Académico

**Branch**: `002-catalogos-tiempo-b2b` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-catalogos-tiempo-b2b/spec.md`

## Summary

Módulo de taxonomía y tiempo académico para el SaaS B2B. Incluye sincronización asíncrona de catálogos (courses/topics/subtopics) desde el Core API via SQS, edición local de alias en topics (subtopics son readonly), y gestión de ciclos académicos con auto-generación de semanas y soft-delete semántico.

## Technical Context

**Language/Version**: TypeScript (NestJS 10+, Nuxt 3, Vue 3 Composition API)

**Primary Dependencies**:
- Backend: `@nestjs/sqs`, `@aws-sdk/client-sqs`, TypeORM, `nestjs-cls`
- Frontend: Pinia, Nuxt UI, `@formkit/auto-animate`

**Storage**: PostgreSQL 16 (Schema-per-tenant, inherited from Spec 001)

**Testing**: Jest (backend), Vitest (frontend)

**Target Platform**: B2B SaaS Web Application

**Architecture Pattern**: Clean Architecture (Use Cases → Repository interfaces), Persistencia Híbrida (TypeORM 80%, Raw SQL 20%)

**Constraints**:
- Use Cases NUNCA interactúan con ORM directamente
- Subtopics son readonly (no `local_alias`)
- Eliminación física de `cycle_weeks` prohibida (soft-delete obligatorio)
- DLQ obligatoria para mensajes SQS fallidos

## Constitution Check

- [x] **Separación de Dominios**: La taxonomía local es una copia simplificada del Core. No almacena contenido de reactivos. ✅
- [x] **Clean Architecture**: Use Cases aislados del ORM via interfaces de repositorio. ✅
- [x] **Asincronía Extrema**: SQS Consumer procesa sincronización en background. ✅
- [x] **Antipatrón NUNCA eliminar semanas**: Soft-delete semántico implementado. ✅
- [x] **Schema-per-tenant**: Heredado de Spec 001. ✅

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SINCRONIZACIÓN DE CATÁLOGOS (SQS)                               │
│                                                                 │
│  Core API          Amazon SQS         NestJS Consumer  Tenant DB│
│  ────────          ──────────         ──────────────── ─────────│
│                                                                 │
│  TopicCreated ──►  Queue ──────────►  SqsCatalogConsumer        │
│  TopicUpdated ──►                     │                         │
│                                       ├── Parse event           │
│                                       ├── Resolve tenant schema │
│                                       ├── Raw SQL:              │
│                                       │   INSERT ... ON CONFLICT│
│                                       │   DO UPDATE SET         │
│                                       │   core_name = EXCLUDED  │
│                                       │   (preserva local_alias)│
│                                       └── ACK message           │
│                                                                 │
│  Si falla N veces ──► DLQ (Dead Letter Queue)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GESTIÓN DE TIEMPO ACADÉMICO                                     │
│                                                                 │
│  Admin UI          NestJS                PostgreSQL              │
│  ────────          ──────                ──────────              │
│                                                                 │
│  Crear Ciclo: ──►  POST /academic-time/cycles                   │
│  {name, start,     │                                            │
│   weeks: 16,       ├── Validate inputs                          │
│   days: 5}         ├── Calculate end_date = start + (16×5 days) │
│                    ├── INSERT cycle                              │
│                    ├── GENERATE 16 cycle_weeks with:             │
│                    │   - week_number: 1..16                      │
│                    │   - start/end dates calculated              │
│                    │   - is_active: true (all)                   │
│                    └── Return cycle + weeks                      │
│                                                                 │
│  Desactivar ───►   PATCH /academic-time/weeks/:id               │
│  semana 8          │                                            │
│                    └── SET is_active = false (NO DELETE)         │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

### Documentation (this feature)

```text
specs/002-catalogos-tiempo-b2b/
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-catalogs.md
│   ├── api-academic-time.md
│   └── sqs-catalog-events.md
└── tasks.md
```

### Source Code

```text
backend-nestjs/src/
├── catalogs/
│   ├── catalogs.controller.ts
│   ├── catalogs.module.ts
│   ├── catalog.use-case.ts
│   ├── catalog.use-case.spec.ts
│   ├── entities/
│   │   ├── course.entity.ts
│   │   ├── topic.entity.ts
│   │   └── subtopic.entity.ts
│   ├── repositories/
│   │   ├── i-catalog.repository.ts
│   │   └── catalog.repository.ts
│   └── sqs-catalog.consumer.ts
├── academic-time/
│   ├── academic-time.controller.ts
│   ├── academic-time.module.ts
│   ├── academic-time.use-case.ts
│   ├── academic-time.use-case.spec.ts
│   ├── entities/
│   │   ├── cycle.entity.ts
│   │   └── cycle-week.entity.ts
│   └── repositories/
│       ├── i-academic-time.repository.ts
│       └── academic-time.repository.ts

frontend-vue/src/features/
├── catalogs/
│   ├── components/CatalogTable.vue
│   ├── store/index.ts
│   └── types/index.ts
├── academic-time/
│   ├── components/
│   │   ├── CycleSlideOver.vue
│   │   └── WeeksMatrix.vue
│   ├── store/index.ts
│   └── types/index.ts
```

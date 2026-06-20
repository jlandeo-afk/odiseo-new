# Implementation Plan: Catálogos Simplificados y Gestión del Tiempo Académico

**Branch**: `002-catalogos-tiempo-b2b` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-catalogos-tiempo-b2b/spec.md`

## Summary

Módulo de taxonomía y tiempo académico para el SaaS B2B. Incluye sincronización de catálogos mediante Cron Job (API Polling) hacia un esquema `public` centralizado, gestión de visibilidad local de temas, y creación de ciclos académicos con auto-generación de semanas.

## Technical Context

**Language/Version**: TypeScript (NestJS 10+, Nuxt 3, Vue 3 Composition API con `<script setup lang="ts">` estricto)

**Primary Dependencies**:
- Backend: `@nestjs/schedule` (para el Cron), Axios/Fetch (API Polling), TypeORM, `nestjs-cls`
- Frontend: Pinia, Nuxt UI, `@formkit/auto-animate`, Vitest

**Storage**: PostgreSQL 16
- **Global**: Esquema `public` para `courses`, `topics`, `subtopics`
- **Tenant**: Esquema `tenant_xxx` para `tenant_topic_visibility`, `cycle`, `cycle_weeks`

**Testing**: Jest (backend), Vitest (frontend unit tests obligatorios), Playwright (E2E). Requisito: `test-cases.md`.

**Target Platform**: B2B SaaS Web Application

**Architecture Pattern**: Clean Architecture (Use Cases → Repository interfaces)

**Constraints**:
- SQS descartado. Usar Cron Job.
- Eliminación física de `cycles` y `cycle_weeks` prohibida si tienen relaciones (usar `is_active = false`).
- Solapamiento de ciclos permitido.
- UI/UX: Formularios con placeholders, validaciones (`max`, `count`), diálogos con botón X y acciones primarias.
- Composable `useTableData` debe recibir un solo parámetro.

## Constitution Check

- [x] **Separación de Dominios**: La taxonomía se importa del Core API y es de solo lectura. ✅
- [x] **Arquitectura Limpia**: Use Cases aislados del ORM via interfaces. ✅
- [x] **Testing**: Vitest para UI y generación de `test-cases.md`. ✅
- [x] **Antipatrones**: Evitar borrado físico. Validaciones frontend obligatorias. ✅

## Architecture Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│ SINCRONIZACIÓN DE CATÁLOGOS (CRON JOB)                          │
│                                                                 │
│  Core API          NestJS Cron Job    PostgreSQL (public)       │
│  ────────          ───────────────    ───────────────────       │
│                                                                 │
│  GET /catalogs ◄── Polling (ej. 1hr)                            │
│  { courses... }──► Parse JSON                                   │
│                    UPSERT courses, topics, subtopics            │
│                    en esquema 'public' (1 sola vez)             │
│                                                                 │
│ VISIBILIDAD LOCAL (Tenant UI)                                   │
│                                                                 │
│  Tenant Admin      NestJS API         PostgreSQL (tenant_xyz)   │
│  ────────────      ──────────         ───────────────────────   │
│  Ocultar Tema 1──► PATCH /topics/1 ──► INSERT/UPDATE            │
│                                        tenant_topic_visibility  │
│                                        (is_active = false)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GESTIÓN DE TIEMPO ACADÉMICO                                     │
│                                                                 │
│  Admin UI          NestJS                PostgreSQL (tenant_xyz)│
│  ────────          ──────                ───────────────────────│
│                                                                 │
│  Crear Ciclo: ──►  POST /academic-time/cycles                   │
│  {name, start,     │                                            │
│   weeks: 16,       ├── Calculate fechas:                        │
│   days: 5}         │   Semana N inicio = start + (N-1)*7        │
│                    │   Semana N fin = inicio + days - 1         │
│                    ├── INSERT cycle                              │
│                    ├── INSERT 16 cycle_weeks                     │
│                    └── Return cycle + weeks                      │
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
├── test-cases.md        # BDD Scenarios & Unit tests (Nuevo requerimiento)
├── contracts/
│   ├── api-catalogs.md
│   └── api-academic-time.md
└── tasks.md
```

### Source Code

```text
backend-nestjs/src/
├── catalogs/
│   ├── catalogs.controller.ts
│   ├── catalogs.module.ts
│   ├── catalog.use-case.ts
│   ├── catalog.cron.ts                 # NUEVO: Reemplaza al SQS Consumer
│   ├── entities/
│   │   ├── course.entity.ts            # public schema
│   │   ├── topic.entity.ts             # public schema
│   │   └── subtopic.entity.ts          # public schema
│   └── repositories/
│       ├── i-catalog.repository.ts
│       └── catalog.repository.ts
├── academic-time/
│   ├── academic-time.controller.ts
│   ├── academic-time.use-case.ts
│   ├── entities/
│   │   ├── tenant-topic-visibility.entity.ts
│   │   ├── cycle.entity.ts
│   │   ├── cycle-week.entity.ts
│   │   ├── cycle-material-profile.entity.ts
│   │   └── cycle-material-profile-course.entity.ts
│   ├── repositories/
│       └── academic-time.repository.ts

frontend-vue/src/features/
├── catalogs/
│   ├── components/CatalogTable.vue
│   └── store/index.ts
├── academic-time/
│   ├── components/
│   │   ├── CycleList.vue
│   │   ├── CycleCreationSlideOver.vue
│   │   └── CycleMaterialProfilesTab.vue
│   ├── store/index.ts
```

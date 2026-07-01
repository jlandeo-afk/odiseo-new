# Implementation Plan: Gestión de Sílabos

**Branch**: `003-gestion-silabos` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-gestion-silabos/spec.md`

## Summary

CRUD de sílabos vinculados a ciclos y cursos. Cada sílabo define la distribución de temas/subtemas por semana estableciendo la cantidad de preguntas exacta. Es el insumo principal alineado a la cantidad de preguntas configurada en las plantillas de materiales PDF.

## Technical Context

**Language/Version**: TypeScript (NestJS 10+, Nuxt 3)
**Primary Dependencies**: TypeORM, Pinia, Nuxt UI
**Storage**: PostgreSQL 16 (Schema-per-tenant)
**Architecture Pattern**: Clean Architecture (Use Cases → Repository interfaces)
**Constraints**: Use Cases no tocan ORM; Optimistic UI; Data-Density design

## Constitution Check

- [x] **Separación de Dominios**: Sílabos son datos locales del tenant, no del Core. ✅
- [x] **Clean Architecture**: Use Cases aislados. ✅
- [x] **Schema-per-tenant**: Heredado. ✅

## Project Structure

```text
backend-nestjs/src/
├── syllabus/
│   ├── syllabus.controller.ts
│   ├── syllabus.module.ts
│   ├── syllabus.use-case.ts
│   ├── syllabus.use-case.spec.ts
│   ├── entities/
│   │   ├── syllabus.entity.ts
│   │   └── syllabus-distribution.entity.ts
│   ├── repositories/
│   │   ├── i-syllabus.repository.ts
│   │   └── syllabus.repository.ts
│   └── dto/
│       ├── create-syllabus.dto.ts
│       └── create-distribution.dto.ts

frontend-vue/src/features/
├── syllabus/
│   ├── components/
│   │   ├── SyllabusDistributionMatrix.vue
│   │   └── SyllabusSlideOver.vue
│   ├── store/index.ts
│   ├── types/index.ts
│   └── pages/index.vue
```

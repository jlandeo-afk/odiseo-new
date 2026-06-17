# Implementation Plan: Historial y Trazabilidad

**Branch**: `005-historial-trazabilidad` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

## Summary

Módulo de historial de materiales generados con reglas anti-repetición de preguntas. Registra qué question_id se usaron en cada material, excluye preguntas recientes al generar nuevos materiales, y provee auditoría completa.

## Technical Context

**Language/Version**: TypeScript (NestJS), Nuxt 3
**Storage**: PostgreSQL 16 — índice compuesto para performance en anti-repetición
**Constraints**: Query anti-repetición debe ser eficiente (índice compuesto requerido)

## Project Structure

```text
backend-nestjs/src/materials/
├── entities/
│   └── material-question-usage.entity.ts  # NEW
├── repositories/
│   └── i-materials.repository.ts          # EXTEND with usage tracking
└── materials.use-case.ts                  # EXTEND with exclusion logic

frontend-vue/src/features/materials/
├── components/
│   └── MaterialHistory.vue    # NEW
└── pages/
    └── history.vue            # NEW
```

# Implementation Plan: Plantillas PDF Personalizables

**Branch**: (none) | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-plantillas-pdf-personalizables/spec.md`

## Summary

Sistema de plantillas de diseño visual para PDFs de materiales académicos. Los administradores crean diseños con logo, colores, portada, header, footer, y al generar material seleccionan cuál aplicar. El diseño se guarda en `PdfDesignTemplate` y el worker de Playwright lo aplica al compilar el PDF. Preview es HTML renderizado síncrono (sin Playwright).

## Technical Context

**Language/Version**: TypeScript, Node.js (NestJS backend + Nuxt 3 frontend)

**Primary Dependencies**: 
- `playwright` v1.61.1 (PDF generation — already installed)
- `@aws-sdk/client-s3` (asset storage — already installed)
- `multer` (file upload — new dependency)
- `pdf-lib` v1.17.1 (PDF merge — already installed)

**Storage**: PostgreSQL (`PdfDesignTemplate` table) + S3 (logo, background images at `designs/{tenant_id}/`)

**Testing**: Jest (backend), Vitest (frontend)

**Target Platform**: Web (SaaS B2B)

**Project Type**: Web application (NestJS backend + Nuxt 3 frontend)

**Performance Goals**: Preview HTML generation < 500ms. Asset upload < 2s for images under 2MB.

**Constraints**: 
- Constitucion: NUNCA compilar PDFs de forma síncrona (preview es HTML, no PDF)
- Multi-tenant: schema-per-tenant, assets en S3 con prefijo por tenant
- Assets < 2MB, formatos PNG/JPG

**Scale/Scope**: 1-3 plantillas de diseño por tenant, 2-5 assets por plantilla

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Justification |
|------|--------|---------------|
| **PDFs async** (no sync compilation) | ✅ PASS | Generación real via BullMQ worker. Preview es HTML string, no PDF, sin Playwright |
| **Clean Architecture** (logic independent of UI/DB) | ✅ PASS | `PdfDesignTemplate` entity + service layer. Worker fetches from DB by ID |
| **Multi-tenant isolation** | ✅ PASS | Assets in S3 with `designs/{tenant_id}/` prefix. Data in tenant schema |
| **S3 reuse** (no new storage) | ✅ PASS | Reuses `odiseo-materials` bucket + existing `S3Service.uploadBuffer()` |

**Result**: All gates pass. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/006-plantillas-pdf-personalizables/
├── plan.md              ← This file
├── spec.md              ← Feature specification (from /speckit-specify)
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── api-design-crud.md
│   ├── api-upload-asset.md
│   └── api-preview.md
└── tasks.md             ← Phase 2 output
```

### Source Code (repository root)

```text
backend-nestjs/src/
├── materials/
│   ├── pdf-design/
│   │   ├── pdf-design.entity.ts        ← Nueva entidad
│   │   ├── pdf-design.service.ts       ← CRUD + lógica
│   │   ├── pdf-design.controller.ts    ← Endpoints
│   │   └── pdf-design.module.ts        ← Módulo
│   ├── dto/
│   │   ├── create-pdf-design.dto.ts
│   │   ├── update-pdf-design.dto.ts
│   │   ├── upload-asset.dto.ts
│   │   └── generate-material.dto.ts    ← Extender con design_template_id
│   ├── services/
│   │   └── pdf-generator.service.ts    ← Inyectar diseño en HTML
│   └── processors/
│       └── pdf-generation.processor.ts ← Recibir design_template_id

frontend-vue/src/
├── features/
│   └── materials/
│       ├── components/
│       │   ├── PdfDesignList.vue         ← Lista de diseños
│       │   ├── PdfDesignForm.vue         ← Crear/editar diseño
│       │   ├── PdfDesignPreview.vue      ← Preview HTML del diseño
│       │   └── PdfDesignSelector.vue     ← Selector al generar material
│       ├── store/
│       │   └── pdfDesigns.ts            ← Store de diseños
│       └── pages/                       ← (si son páginas independientes)
```

**Structure Decision**: Nueva feature module `pdf-design` dentro de `materials/` (backend). Componentes dentro de `features/materials/` (frontend). Sigue la estructura existente del proyecto.

## Complexity Tracking

N/A — No constitution violations.

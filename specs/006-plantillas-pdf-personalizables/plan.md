# Implementation Plan: Plantillas PDF Personalizables

**Branch**: (none) | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-plantillas-pdf-personalizables/spec.md` (post-clarification)

## Summary

Sistema de diseños visuales independientes para PDFs de materiales académicos con enfoque a imprenta (Book Mode). Los administradores crean diseños configurando márgenes de encuadernación y grillas JSON de 3 zonas (Izquierda, Centro, Derecha) para Header y Footer con inyección de variables. Los diseños se seleccionan al generar material. El layout HTML base es fijo, pero el CSS se inyecta dinámicamente incluyendo reglas `@page :left/:right` para el espejado de libros, y el contenido del cuerpo (preguntas, claves) sigue siendo responsabilidad del motor de generación.

## Technical Context

**Language/Version**: TypeScript, Node.js (NestJS backend + Nuxt 3 frontend)

**Primary Dependencies**: 
- `playwright` v1.61.1 (PDF generation — already installed)
- `@aws-sdk/client-s3` (asset storage — already installed)
- `multer` (file upload — already installed via `@nestjs/platform-express`)
- `pdf-lib` v1.17.1 (PDF merge — already installed)
- `sharp` (image processing — already installed)

**Storage**: PostgreSQL (`pdf_design_templates` table, schema-per-tenant) + S3 (logo, banner, watermark at `designs/{tenant_id}/`)

**Testing**: Jest (backend), Vitest (frontend)

**Target Platform**: Web (SaaS B2B)

**Project Type**: Web application (NestJS backend + Nuxt 3 frontend)

**Performance Goals**: Preview HTML generation < 500ms. Asset upload < 2s for images under 2MB.

**Constraints**: 
- Constitucion: NUNCA compilar PDFs de forma síncrona (preview es HTML, no PDF)
- Multi-tenant: schema-per-tenant, assets en S3 con prefijo por tenant
- Assets < 2MB, formatos PNG/JPG
- Layout del HTML template es FIJO — solo se inyectan contenidos y CSS variables

**Scale/Scope**: 1-3 diseños por tenant, 2-5 assets por diseño

## Existing Implementation State

> ⚠️ **IMPORTANT**: There is already partial implementation from a prior plan iteration. The entity, service, processor, and migration exist but use the **old model** (primaryColor hex, fontFamily, showCover, showFrame, etc.). These must be **migrated** to align with the real HTML template.

### Files that need modification (not creation from scratch):

| File | Current State | Required Change |
|------|--------------|-----------------|
| `pdf-design-template.entity.ts` | Old fields (marginLeft/Right, headerText, logoUrl) | Replace with JSONB (`headerConfig`, `footerConfig`), `marginInside`, `marginOutside`, `isBookMode` |
| `pdf-design.service.ts` | CRUD works, preview generates generic HTML | Update fields, rewrite preview to use real HTML template |
| `pdf-generator.service.ts` | `DesignTemplateConfig` interface uses old fields | Align interface, inject `@page :left/right` CSS print rules and replace `{variables}` |
| `pdf-generation.processor.ts` | `loadDesignTemplate` maps old fields | Update mapping to new fields |
| `CreatePdfDesignDto` | Old field validation | Update to new fields (validate JSONB grids) |
| Migration `CreatePdfDesignTemplate` | Old columns | Create new migration `AlterPdfDesignTemplateColumns` to drop old columns and add new JSONB/book-mode columns |

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
├── spec.md              ← Feature specification (clarified 2026-06-26)
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── api-design-crud.md
│   ├── api-upload-asset.md
│   ├── api-preview.md
│   └── api-generate-material.md
└── tasks.md             ← Phase 2 output
```

### Source Code (repository root)

```text
backend-nestjs/src/
├── materials/
│   ├── entities/
│   │   └── pdf-design-template.entity.ts  ← MODIFY: new fields
│   ├── pdf-design/
│   │   └── pdf-design.service.ts          ← MODIFY: new fields + real template preview
│   ├── dto/
│   │   ├── create-pdf-design.dto.ts       ← MODIFY: new validation
│   │   └── generate-material.dto.ts       ← Already extended with design_template_id
│   ├── services/
│   │   └── pdf-generator.service.ts       ← MODIFY: DesignTemplateConfig + buildDesignHtml with real template
│   └── processors/
│       └── pdf-generation.processor.ts    ← MODIFY: loadDesignTemplate mapping
├── migrations/
│   └── XXXX-AlterPdfDesignTemplateColumns.ts  ← NEW: migration for column changes

frontend-vue/src/
├── features/
│   └── materials/
│       ├── components/
│       │   ├── PdfDesignList.vue           ← Lista de diseños (card grid)
│       │   ├── PdfDesignForm.vue           ← Crear/editar diseño con preview en tiempo real
│       │   ├── PdfDesignPreview.vue        ← Iframe preview component
│       │   └── PdfDesignSelector.vue       ← Selector con preview al generar material
│       └── store/
│           └── pdfDesigns.ts              ← Store de diseños
```

**Structure Decision**: Modifica el feature module `pdf-design` existente dentro de `materials/` (backend). Nuevos componentes dentro de `features/materials/` (frontend).

## Key Design Decision: Real Template Alignment

The `index.html` template defines the actual PDF structure with:
- CSS variables: `--v-theme-primary-title`, `--v-theme-secondary-title`, `--v-theme-primary-background` (RGB triplets)
- Fixed layout: `layout__header-fixed` with logo container, banner background, title, subtitles
- Watermark: `layout__watermark-fixed` with centered image at 10% opacity
- Content wrapper: `content__wrapper columns-2` with question blocks

The `PdfDesignTemplate` fields map directly to these CSS variables and HTML slots:

| PdfDesignTemplate Field | CSS Variable / HTML Slot |
|------------------------|--------------------------|
| `primary_title_color` (RGB) | `--v-theme-primary-title` |
| `secondary_title_color` (RGB) | `--v-theme-secondary-title` |
| `background_highlight_color` (RGB) | `--v-theme-primary-background` |
| `logo_url` | `.header__logo src` |
| `banner_image_url` | `.header__banner background-image` |
| `watermark_image_url` | `.layout__watermark-fixed img src` |
| `header_text` | `.header__title` content |
| `footer_text` | Footer slot (resolved with `{page}`, `{total}`) |

## Complexity Tracking

N/A — No constitution violations.

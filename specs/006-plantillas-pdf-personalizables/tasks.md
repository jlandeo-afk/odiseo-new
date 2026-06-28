# Tasks: Plantillas PDF Personalizables

**Input**: Design documents from `/specs/006-plantillas-pdf-personalizables/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. Since there's an existing partial implementation using the **old model** (hex colors, fontFamily, showCover, etc.), many tasks are **modifications** rather than creation from scratch.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Migration & Entity Alignment)

**Purpose**: Align the existing `PdfDesignTemplate` entity and database schema with the clarified spec (RGB colors, banner, watermark, remove old fields)

- [x] T001 Update `PdfDesignTemplate` entity to replace old fields with new ones in `backend-nestjs/src/materials/entities/pdf-design-template.entity.ts` — Remove: `primaryColor`, `fontFamily`, `showCover`, `backgroundUrl`, `showPagination`, `showFrame`, `contactInfo`. Add: `bannerImageUrl`, `watermarkImageUrl`, `primaryTitleColor` (varchar(20), default `'2, 113, 184'`), `secondaryTitleColor` (varchar(20), default `'2, 113, 184'`), `backgroundHighlightColor` (varchar(20), default `'214, 238, 253'`)
- [x] T002 Create migration to alter `pdf_design_templates` table columns in `backend-nestjs/src/migrations/1718640000005-AlterPdfDesignTemplateColumns.ts` — Drop old columns, add new columns with defaults, keep existing data (logo_url, name, is_default, header_text, footer_text)
- [x] T003 Update `CreatePdfDesignDto` with new field validation (RGB format regex `^\d{1,3},\s?\d{1,3},\s?\d{1,3}$`) in `backend-nestjs/src/materials/dto/create-pdf-design.dto.ts` — Remove old field validators, add new color validators
- [x] T004 Update `DesignTemplateConfig` interface to match new entity fields in `backend-nestjs/src/materials/services/pdf-generator.service.ts` — Replace `primaryColor`, `fontFamily`, `showCover`, `showFrame`, `showPagination`, `contactInfo`, `backgroundUrl` with `bannerImageUrl`, `watermarkImageUrl`, `primaryTitleColor`, `secondaryTitleColor`, `backgroundHighlightColor`

---

## Phase 2: Foundational (Template Engine Alignment)

**Purpose**: Core infrastructure — align the HTML generation engine with the real template (`index.html`) and update the worker's design loading

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Rewrite `buildDesignHtml()` method in `backend-nestjs/src/materials/services/pdf-generator.service.ts` to use the real HTML template structure from `index.html` — Inject CSS variables (`--v-theme-primary-title`, `--v-theme-secondary-title`, `--v-theme-primary-background`) and image slots (logo, banner background-image, watermark) instead of generating a generic HTML structure
- [x] T006 Update `loadDesignTemplate()` mapping in `backend-nestjs/src/materials/processors/pdf-generation.processor.ts` to map new entity fields (`bannerImageUrl`, `watermarkImageUrl`, `primaryTitleColor`, `secondaryTitleColor`, `backgroundHighlightColor`) to the updated `DesignTemplateConfig` interface
- [x] T007 Implement base64 image fetching utility for Playwright rendering — Add helper in `backend-nestjs/src/materials/services/pdf-generator.service.ts` (or a shared util) that downloads S3 images and converts them to `data:image/png;base64,...` URIs for embedding in HTML before Playwright renders

**Checkpoint**: Backend compiles, migration runs, and the existing CRUD + worker pipeline works with the new entity fields

---

## Phase 3: User Story 1 — Crear y gestionar diseños visuales de PDF (Priority: P1) 🎯 MVP

**Goal**: Administrador puede crear diseños visuales independientes con logo, banner, watermark, colores RGB, y marcar uno como default. Al generar material, se aplica el diseño seleccionado (o default).

**Independent Test**: Crear diseño con colores, subir logo/banner/watermark, marcarlo como default, generar un PDF y verificar que refleje los cambios visuales.

### Implementation for User Story 1

- [x] T008 [US1] Update CRUD methods in `backend-nestjs/src/materials/pdf-design/pdf-design.service.ts` — Update `create()`, `update()`, `findAll()`, `findById()` to use new entity fields. Update `delete()` to allow deleting default (no auto-promote, system falls back to base HTML per clarification)
- [x] T009 [US1] Consolidate asset upload into a single generic endpoint in `backend-nestjs/src/materials/pdf-design/pdf-design.service.ts` — Refactor `uploadLogo()` and `uploadBackground()` into a single `uploadAsset(designId, tenantId, file, type: 'logo' | 'banner' | 'watermark')` method. Add `uploadWatermark` logic. Update S3 key pattern to `designs/{tenant_id}/{design_id}-{type}.png`
- [x] T010 [US1] Update controller endpoints in `backend-nestjs/src/materials/pdf-design/pdf-design.controller.ts` — Replace separate `upload-logo` and `upload-background` endpoints with `POST /:id/upload-asset?type=logo|banner|watermark`. Update `DELETE /:id/asset?type=logo|banner|watermark` to include watermark
- [x] T011 [US1] Update default design resolution in material generation flow — In `backend-nestjs/src/materials/materials.service.ts` (or wherever `generate` is handled): if no `design_template_id` is provided, query for the tenant's default design (`is_default = true`) and inject its ID into the job payload
- [x] T012 [P] [US1] Update `pdfDesigns` store to use new API fields in `frontend-vue/src/features/materials/store/pdfDesigns.ts` — Replace old field types (primaryColor hex, fontFamily, showCover, etc.) with new ones (primaryTitleColor, secondaryTitleColor, backgroundHighlightColor as RGB strings, bannerImageUrl, watermarkImageUrl). Update API calls
- [x] T013 [P] [US1] Update `PdfDesignForm.vue` to use new fields in `frontend-vue/src/features/materials/components/PdfDesignForm.vue` — Replace hex color picker with RGB color inputs (or 3-component picker). Remove fontFamily, showCover, showFrame, showPagination, contactInfo form fields. Add banner upload and watermark upload sections. Keep logo upload
- [x] T014 [US1] Update `PdfDesignList.vue` to display new fields in `frontend-vue/src/features/materials/components/PdfDesignList.vue` — Show design cards with color swatches (RGB), thumbnail of banner, default badge
- [x] T015 [US1] Update `PdfDesignSelector.vue` to work with new fields in `frontend-vue/src/features/materials/components/PdfDesignSelector.vue` — Ensure selector shows design name, color swatches, default indicator. Connects to generation flow

**Checkpoint**: User Story 1 is fully functional — designs with new fields can be created, assets uploaded, default set, and PDFs generated with the real template

---

## Phase 4: User Story 2 — Configurar contenido de header y footer por diseño (Priority: P2)

**Goal**: Administrador puede personalizar el contenido textual del header (título principal, subtítulos) y footer dentro del layout fijo, usando variables dinámicas.

**Independent Test**: Configurar header_text con `{template_name} - Semana {week_number}` y footer_text con `Página {page} de {total}`, generar un PDF, verificar que las variables se resuelvan correctamente.

### Implementation for User Story 2

- [x] T016 [US2] Implement variable resolution in `buildDesignHtml()` in `backend-nestjs/src/materials/services/pdf-generator.service.ts` — Resolve `{page}`, `{total}`, `{course_name}`, `{week_number}`, `{template_name}`, `{cycle_name}` in `headerText` and `footerText` before injecting into the HTML template slots (`.header__title`, `.header__course`, footer). Use Playwright's built-in `pageNumber`/`totalPages` for `{page}/{total}` via header/footer print options
- [x] T017 [US2] Add header/footer configuration section in `PdfDesignForm.vue` in `frontend-vue/src/features/materials/components/PdfDesignForm.vue` — Add text inputs for `headerText` and `footerText` with a helper showing available variables (`{page}`, `{total}`, `{course_name}`, etc.). Include a tooltip or inline help explaining the slot-based model
- [x] T018 [US2] Map subtitles to HTML template slots — In the `buildDesignHtml()` method, map the resolved header/footer text to the correct HTML slots: `.header__title` for the main title, `.header__course` for course info, `.header__cycle` for cycle info, per the fixed layout of `index.html`

**Checkpoint**: Header and footer text with dynamic variables work correctly in generated PDFs

---

## Phase 5: User Story 3 — Previsualizar diseño en edición y al generar (Priority: P3)

**Goal**: Administrador puede ver un preview HTML del diseño tanto al crear/editar como al seleccionarlo para generación de material.

**Independent Test**: Editar colores en el formulario de diseño y verificar que el preview se actualiza en tiempo real. Luego seleccionar un diseño al generar material y verificar que el preview muestra datos del material real.

### Implementation for User Story 3

- [x] T019 [US3] Rewrite `generatePreview()` method in `backend-nestjs/src/materials/pdf-design/pdf-design.service.ts` — Use the real HTML template (same structure as `buildDesignHtml()`) with CSS variables injected, sample questions (lorem ipsum), and resolved header/footer variables. Support two modes: (1) saved design by ID, (2) overrides for unsaved changes. Add optional `context` parameter for generation-time preview with real material data (courseName, weekNumber, templateName)
- [x] T020 [US3] Create `PdfDesignPreview.vue` component in `frontend-vue/src/features/materials/components/PdfDesignPreview.vue` — Iframe-based preview that receives HTML string via `srcdoc`. Include loading state, responsive sizing (A4 aspect ratio), and zoom controls
- [x] T021 [US3] Integrate real-time preview in `PdfDesignForm.vue` in `frontend-vue/src/features/materials/components/PdfDesignForm.vue` — Add side-by-side layout: form on left, preview iframe on right. Debounce form changes (500ms) and call preview endpoint with current form values as overrides. Show preview on initial load with saved values
- [x] T022 [US3] Integrate generation-time preview in `PdfDesignSelector.vue` in `frontend-vue/src/features/materials/components/PdfDesignSelector.vue` — When user selects a design from the list, show a preview below/beside the selector with the actual material context (courseName, weekNumber, templateName from the generation form)
- [x] T023 [US3] Update `PdfDesignSlideOver.vue` in `frontend-vue/src/features/materials/components/PdfDesignSlideOver.vue` — Ensure the slide-over container properly accommodates the preview component alongside the form

**Checkpoint**: Preview works in both contexts — real-time during design editing and confirmation during material generation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, validation, and documentation

- [x] T024 [P] Remove dead code from old model — Clean up any remaining references to old fields (`primaryColor`, `fontFamily`, `showCover`, `showFrame`, `showPagination`, `contactInfo`, `backgroundUrl`) across all backend and frontend files
- [x] T025 [P] Validate S3 asset cleanup on design deletion — Ensure `deleteAsset()` in `pdf-design.service.ts` properly handles all 3 asset types and that S3 cleanup is documented (scheduled job vs. immediate)
- [x] T026 Run quickstart.md validation scenarios — Execute all 5 validation scenarios from `specs/006-plantillas-pdf-personalizables/quickstart.md` to verify end-to-end functionality
- [x] T027 [P] Verify multi-tenant isolation — Test that designs and assets are properly isolated per tenant (schema-per-tenant for DB, `designs/{tenant_id}/` prefix for S3)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — core CRUD + assets + generation with new model
- **Phase 4 (US2)**: Depends on Phase 2 — can run in parallel with US1 (different concerns)
- **Phase 5 (US3)**: Depends on Phase 3 (needs working CRUD and preview backend to be meaningful)
- **Phase 6 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P2)**: Can start after Phase 2 — Independent of US1 (header/footer text is a separate concern)
- **US3 (P3)**: Depends on US1 (needs working designs and assets to preview)

### Within Each User Story

- Backend changes before frontend
- Entity/DTO before service
- Service before controller
- Controller before frontend store
- Store before components

### Parallel Opportunities

- **Phase 1**: T001 and T003 can run in parallel (entity vs DTO)
- **Phase 2**: T005, T006, T007 are sequential (T005 first, then T006 uses updated interface)
- **Phase 3**: T012 + T013 can run in parallel (frontend store + form, after backend T008-T011 complete)
- **Phase 4**: US2 can run in parallel with US1 (T016 touches a different method than T008)
- **Phase 5**: T020 can run in parallel with T019 (frontend component + backend method)

---

## Parallel Example: User Story 1

```text
# After backend tasks T008-T011 are complete:
# Launch frontend tasks in parallel:
Task T012: "Update pdfDesigns store" in frontend-vue/src/features/materials/store/pdfDesigns.ts
Task T013: "Update PdfDesignForm.vue" in frontend-vue/src/features/materials/components/PdfDesignForm.vue
```

## Parallel Example: User Story 3

```text
# After T019 (backend preview) is complete:
# Launch frontend preview tasks in parallel:
Task T020: "Create PdfDesignPreview.vue" in frontend-vue/src/features/materials/components/PdfDesignPreview.vue
Task T021: "Integrate preview in PdfDesignForm.vue" (after T020)
Task T022: "Integrate preview in PdfDesignSelector.vue" (after T020)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Entity + Migration + DTO alignment
2. Complete Phase 2: Template engine alignment with real HTML
3. Complete Phase 3: US1 — CRUD, assets, default, generation
4. **STOP and VALIDATE**: Create a design, upload logo/banner, generate PDF, verify real template applies
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (backend compiles, DB migrated)
2. Add US1 → Test CRUD + generation → Deploy/Demo (MVP!)
3. Add US2 → Test header/footer variables → Deploy/Demo
4. Add US3 → Test preview in both contexts → Deploy/Demo
5. Phase 6 → Polish, cleanup, validate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Since there's existing implementation, most tasks are **modifications** not creation from scratch
- The key architectural change is aligning with the **real HTML template** (`index.html`) instead of generating a generic HTML
- RGB color format `"R, G, B"` (string) maps directly to CSS variables — no conversion needed
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

# Quickstart: Plantillas PDF Personalizables

**Feature**: Diseños visuales independientes para PDFs de materiales.
**Updated**: 2026-06-27 (post-clarification)

## Prerequisites

- Backend NestJS corriendo (`npm run start:dev` desde `backend-nestjs/`)
- Frontend Nuxt corriendo (`npm run dev` desde `frontend-vue/`)
- LocalStack o S3 configurado
- Base de datos migrada (`npx typeorm migration:run`)

## Entities & Migrations

```bash
# Backend: generate migration for new columns (after entity update)
cd backend-nestjs
npx typeorm migration:generate src/migrations/AlterPdfDesignTemplateColumns -d src/ormconfig.ts

# Apply
npx typeorm migration:run -d src/ormconfig.ts
```

## Validation Scenarios

### Scenario 1: CRUD de diseño (sin assets)

```bash
# 1. Crear diseño
curl -X POST http://localhost:3000/api/v1/pdf-designs \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Diseño Institucional Azul",
    "primaryTitleColor": "2, 113, 184",
    "secondaryTitleColor": "2, 113, 184",
    "backgroundHighlightColor": "214, 238, 253",
    "headerText": "{template_name} - Semana {week_number}",
    "footerText": "Página {page} de {total}",
    "isDefault": true
  }'

# Expected: 201 + design object with id, isDefault=true

# 2. Listar diseños
curl http://localhost:3000/api/v1/pdf-designs \
  -H "x-subdomain: demo"
# Expected: 200 + array with 1 design

# 3. Obtener por id
curl http://localhost:3000/api/v1/pdf-designs/{id} \
  -H "x-subdomain: demo"
# Expected: 200 + design object

# 4. Actualizar colores
curl -X PATCH http://localhost:3000/api/v1/pdf-designs/{id} \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{"primaryTitleColor": "220, 38, 38", "secondaryTitleColor": "220, 38, 38"}'
# Expected: 200 + updated design with red colors

# 5. Crear segundo diseño y set as default
curl -X POST http://localhost:3000/api/v1/pdf-designs \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{"name": "Diseño Verde", "primaryTitleColor": "5, 150, 105", "isDefault": true}'
# Expected: 201 + new design with isDefault=true
# Verify: GET /pdf-designs → first design isDefault=false

# 6. Eliminar diseño
curl -X DELETE http://localhost:3000/api/v1/pdf-designs/{id} \
  -H "x-subdomain: demo"
# Expected: 204
```

### Scenario 2: Upload de assets

```bash
# 1. Upload logo
curl -X POST "http://localhost:3000/api/v1/pdf-designs/{id}/upload-asset?type=logo" \
  -H "x-subdomain: demo" \
  -F "file=@/path/to/logo.png"
# Expected: 200 + { "url": "https://..." }

# 2. Upload banner
curl -X POST "http://localhost:3000/api/v1/pdf-designs/{id}/upload-asset?type=banner" \
  -H "x-subdomain: demo" \
  -F "file=@/path/to/banner.png"
# Expected: 200 + { "url": "https://..." }

# 3. Upload watermark
curl -X POST "http://localhost:3000/api/v1/pdf-designs/{id}/upload-asset?type=watermark" \
  -H "x-subdomain: demo" \
  -F "file=@/path/to/watermark.png"
# Expected: 200 + { "url": "https://..." }

# 4. Remove asset
curl -X DELETE "http://localhost:3000/api/v1/pdf-designs/{id}/asset?type=logo" \
  -H "x-subdomain: demo"
# Expected: 204 + logoUrl becomes null
```

### Scenario 3: Preview (formulario de diseño)

```bash
# Preview by design ID (already saved)
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/preview \
  -H "x-subdomain: demo"
# Expected: 200 + { html: "<!DOCTYPE html>..." }
# HTML should contain:
#   - --v-theme-primary-title with design's RGB values
#   - Logo as base64 data URI (if logoUrl set)
#   - Sample questions in 2-column layout

# Preview with overrides (unsaved changes)
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/preview \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{"primaryTitleColor": "220, 38, 38", "headerText": "PRUEBA - {course_name}"}'
# Expected: 200 + { html: "..." } with red titles
```

### Scenario 4: Preview (contexto de generación)

```bash
# Preview with real material context
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/preview \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{"context": {"courseName": "MATEMÁTICAS", "weekNumber": 3, "templateName": "PRÁCTICA CALIFICADA"}}'
# Expected: 200 + { html: "..." } with resolved variables
```

### Scenario 5: Generación con diseño

```bash
# 1. Crear material request con design_template_id
curl -X POST http://localhost:3000/api/v1/materials/generate \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "{template_id}",
    "week_number": 3,
    "requires_review": false,
    "courses": [{"course_id": "{course_id}"}],
    "design_template_id": "{design_id}"
  }'
# Expected: 201 + job id and status

# 2. Generar sin design_template_id (debe usar default)
curl -X POST http://localhost:3000/api/v1/materials/generate \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "{template_id}",
    "week_number": 3,
    "requires_review": false,
    "courses": [{"course_id": "{course_id}"}]
  }'
# Expected: 201 + uses default design template

# 3. Descargar PDF generado → verificar logo, colores, banner
```

## Expected Outcomes

| Scenario | Result |
|----------|--------|
| CRUD | Designs can be created, read, updated, deleted with RGB color fields |
| Default toggle | Only one default per tenant, auto-unset previous |
| Upload | Logo/banner/watermark upload to S3, URLs persist in entity |
| Preview (edit) | HTML returned with CSS variables injected from design, real template layout |
| Preview (generate) | HTML with real material context resolved |
| Generation | MaterialRequest stores design_template_id, worker applies it |
| PDF Output | Real template with logo, banner, watermark, RGB colors applied |
| No design | Falls back to base HTML template without customization |

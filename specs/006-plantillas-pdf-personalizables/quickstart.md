# Quickstart: Plantillas PDF Personalizables

**Feature**: Plantillas de diseño visual para PDFs de materiales.

## Prerequisites

- Backend NestJS corriendo (`npm run start:dev` desde `backend-nestjs/`)
- Frontend Nuxt corriendo (`npm run dev` desde `frontend-vue/`)
- LocalStack o S3 configurado
- Base de datos migrada (`npx typeorm migration:run`)

## Entities & Migrations

```bash
# Backend: generate migration after entity is created
cd backend-nestjs
npx typeorm migration:generate src/materials/migrations/CreatePdfDesignTemplate -d src/ormconfig.ts

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
    "name": "Diseño Demo",
    "primaryColor": "#1a56db",
    "fontFamily": "Arial",
    "headerText": "{template_name} - Semana {week_number}",
    "footerText": "Página {page} de {total}",
    "showCover": true,
    "showPagination": true,
    "showFrame": true,
    "contactInfo": "demo@test.com | 123456789",
    "isDefault": true
  }'

# Expected: 201 + design object with id

# 2. Listar diseños
curl http://localhost:3000/api/v1/pdf-designs \
  -H "x-subdomain: demo"
# Expected: 200 + array with 1 design

# 3. Obtener por id
curl http://localhost:3000/api/v1/pdf-designs/{id} \
  -H "x-subdomain: demo"
# Expected: 200 + design object

# 4. Actualizar
curl -X PATCH http://localhost:3000/api/v1/pdf-designs/{id} \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor": "#059669"}'
# Expected: 200 + updated design

# 5. Eliminar
curl -X DELETE http://localhost:3000/api/v1/pdf-designs/{id} \
  -H "x-subdomain: demo"
# Expected: 204
```

### Scenario 2: Upload de assets

```bash
# 1. Upload logo
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/upload-logo \
  -H "x-subdomain: demo" \
  -F "file=@/path/to/logo.png"
# Expected: 200 + { logoUrl: "https://..." }

# 2. Upload background
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/upload-background \
  -H "x-subdomain: demo" \
  -F "file=@/path/to/background.png"
# Expected: 200 + { backgroundUrl: "https://..." }

# 3. Remove logo
curl -X DELETE "http://localhost:3000/api/v1/pdf-designs/{id}/asset?type=logo" \
  -H "x-subdomain: demo"
# Expected: 204 + logoUrl becomes null
```

### Scenario 3: Preview

```bash
# Preview by design ID (already saved)
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/preview \
  -H "x-subdomain: demo"
# Expected: 200 + { html: "<html>..." }

# Preview with inline config (unsaved)
curl -X POST http://localhost:3000/api/v1/pdf-designs/{id}/preview \
  -H "x-subdomain: demo" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor": "#dc2626", "headerText": "Preview Test"}'
# Expected: 200 + { html: "<html>..." }
```

### Scenario 4: Generación con diseño

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

# 2. Verificar que MaterialRequest.design_template_id se guardó
curl http://localhost:3000/api/v1/materials/history?templateIds={template_id}&weekNumbers=3 \
  -H "x-subdomain: demo"
# Expected: Includes design_template_id in response

# 3. Descargar PDF generado → verificar logo, colores, portada
```

### Scenario 5: Worker con diseño

```bash
# Ver logs del worker
tail -f backend-nestjs/logs/app.log
# Expected: "Applying design template {design_id} to material {material_request_id}"
# Expected: "Design applied: logo={url}, primaryColor={hex}, showCover=true"
```

## Expected Outcomes

| Scenario | Result |
|----------|--------|
| CRUD | Designs can be created, read, updated, deleted |
| Upload | Assets upload to S3, URLs persist in entity |
| Preview | HTML returned with injected design variables |
| Generation | MaterialRequest stores design_template_id, worker applies it |
| PDF Output | Logo visible, primary color in accents, portada if enabled |

# Data Model: Plantillas PDF Personalizables

## Entity: PdfDesignTemplate

Table: `pdf_design_templates` (schema-per-tenant)

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `tenant_id` | `varchar` | No | — | Tenant isolation |
| `name` | `varchar(255)` | No | — | Nombre visible de la plantilla |
| `logo_url` | `text` | Sí | `null` | URL del logo en S3 |
| `primary_color` | `varchar(7)` | Sí | `null` | Color hex (#RRGGBB) |
| `font_family` | `varchar(100)` | Sí | `null` | Fuente tipográfica |
| `header_text` | `text` | Sí | `null` | Texto del encabezado |
| `footer_text` | `text` | Sí | `null` | Texto del pie de página |
| `show_cover` | `boolean` | No | `true` | Incluir portada |
| `background_url` | `text` | Sí | `null` | URL de imagen de fondo en S3 |
| `show_pagination` | `boolean` | No | `true` | Mostrar números de página |
| `show_frame` | `boolean` | No | `true` | Mostrar bordes/marco |
| `contact_info` | `text` | Sí | `null` | Información de contacto (empresa) |
| `is_default` | `boolean` | No | `false` | Plantilla por defecto del sistema |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | |

### Constraints

- `PK`: `id`
- Unique: `name` per tenant
- Check: `primary_color` matches regex `^#[0-9A-Fa-f]{6}$` (or nullable)
- Only one row with `is_default = true` per tenant (partial unique index)

### Indexes

- `idx_tenant_default` — `(tenant_id)` WHERE `is_default = true` (unique partial index)

---

## Entity: MaterialRequest (extend existing)

Extender `material_requests` con:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `design_template_id` | `uuid` | Sí | `null` | FK → `pdf_design_templates.id` |

### Constraints

- FK: `design_template_id` → `pdf_design_templates(id)` ON DELETE SET NULL (si se elimina el diseño, el material mantiene trazabilidad sin romper)

---

## Domain: Variables disponibles en header/footer

Soportadas en `header_text` y `footer_text`:

| Variable | Resuelve a |
|----------|-----------|
| `{page}` | Número de página actual |
| `{total}` | Total de páginas |
| `{course_name}` | Nombre del curso |
| `{week_number}` | Número de semana |
| `{template_name}` | Nombre de la plantilla académica (CycleMaterialTemplate) |
| `{cycle_name}` | Nombre del ciclo |

Estas variables se interpolan en el HTML del header/footer ANTES de pasarlo a Playwright.

---

## State Machine

```
PdfDesignTemplate lifecycle:

[Draft] ──(save)──> [Active]
   ↑                    │
   └──(edit)────────────┘
   
No complex state — created, can be edited freely.
Deletion: SET NULL on referenced MaterialRequests.
```

## Assets Storage

```
S3 Bucket: odiseo-materials
  └── designs/
      └── {tenant_id}/
          ├── {design_id}-logo.png
          └── {design_id}-background.png

URL patterns:
  - Logo: https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant_id}/{design_id}-logo.png
  - Background: https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant_id}/{design_id}-background.png
```

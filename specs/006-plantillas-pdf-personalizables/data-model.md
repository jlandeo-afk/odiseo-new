# Data Model: Plantillas PDF Personalizables

**Updated**: 2026-06-27 (post-clarification alignment with real HTML template)

## Entity: PdfDesignTemplate

Table: `pdf_design_templates` (schema-per-tenant)

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `tenant_id` | `varchar` | No | — | Tenant isolation |
| `name` | `varchar(255)` | No | — | Nombre visible del diseño |
| `logo_url` | `text` | Sí | `null` | URL del logo en S3 (se muestra en `.header__logo`) |
| `banner_image_url` | `text` | Sí | `null` | URL de imagen de banner/header en S3 (`.header__banner` background-image) |
| `watermark_image_url` | `text` | Sí | `null` | URL de imagen de watermark en S3 (`.layout__watermark-fixed img`) |
| `primary_title_color` | `varchar(20)` | Sí | `'2, 113, 184'` | Color RGB para títulos primarios (`--v-theme-primary-title`) |
| `secondary_title_color` | `varchar(20)` | Sí | `'2, 113, 184'` | Color RGB para títulos secundarios (`--v-theme-secondary-title`) |
| `background_highlight_color` | `varchar(20)` | Sí | `'214, 238, 253'` | Color RGB para fondos highlight (`--v-theme-primary-background`) |
| `header_text` | `text` | Sí | `null` | Contenido textual del título del header (variables dinámicas) |
| `footer_text` | `text` | Sí | `null` | Contenido textual del footer (variables dinámicas) |
| `is_default` | `boolean` | No | `false` | Diseño por defecto del tenant |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | |

### Removed Fields (vs. old model)

These fields from the previous data model are removed because they don't map to any element in the real HTML template (`index.html`):

| Removed Field | Reason |
|--------------|--------|
| `primary_color` (hex) | Replaced by 3 RGB color fields that map to actual CSS variables |
| `font_family` | Not personalizable per clarification (layout is fixed) |
| `show_cover` | Not in real template; cover page is not part of the design envelope |
| `show_pagination` | Not in real template as a toggle |
| `show_frame` | Not in real template |
| `contact_info` | Not in real template |
| `background_url` | Renamed to `banner_image_url` (more accurate name for the header background) and added `watermark_image_url` |

### Constraints

- `PK`: `id`
- Unique: `name` per tenant
- Check: `primary_title_color` matches regex `^\d{1,3},\s?\d{1,3},\s?\d{1,3}$` (or nullable)
- Check: `secondary_title_color` same validation
- Check: `background_highlight_color` same validation
- Only one row with `is_default = true` per tenant (partial unique index)

### Indexes

- `idx_tenant_default` — `(tenant_id)` WHERE `is_default = true` (unique partial index)

---

## Entity: MaterialRequest (extend existing)

Extender `material_requests` con:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `design_template_id` | `uuid` | Sí | `null` | FK → `pdf_design_templates.id` |

> Already exists in the current entity.

### Constraints

- FK: `design_template_id` → `pdf_design_templates(id)` ON DELETE SET NULL (si se elimina el diseño, el material mantiene trazabilidad sin romper)

---

## Domain: Variables disponibles en header/footer

Soportadas en `header_text` y `footer_text`:

| Variable | Resuelve a | HTML Target |
|----------|-----------|-------------|
| `{page}` | Número de página actual | Counter CSS o Playwright |
| `{total}` | Total de páginas | Counter CSS o Playwright |
| `{course_name}` | Nombre del curso | `.header__course` |
| `{week_number}` | Número de semana | `.header__cycle` |
| `{template_name}` | Nombre de la plantilla académica | `.header__title` |
| `{cycle_name}` | Nombre del ciclo | `.header__cycle` |

Estas variables se interpolan en el HTML del header/footer ANTES de pasarlo a Playwright.

---

## State Machine

```
PdfDesignTemplate lifecycle:

[Created] ──(save)──> [Active]
   ↑                    │
   └──(edit)────────────┘
   
No complex state — created, can be edited freely.
Deletion: SET NULL on referenced MaterialRequests.
Default toggle: Only one per tenant (unset previous automatically).
```

## Assets Storage

```
S3 Bucket: odiseo-materials
  └── designs/
      └── {tenant_id}/
          ├── {design_id}-logo.png
          ├── {design_id}-banner.png
          └── {design_id}-watermark.png

URL patterns:
  - Logo: https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant_id}/{design_id}-logo.png
  - Banner: https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant_id}/{design_id}-banner.png
  - Watermark: https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant_id}/{design_id}-watermark.png
```

## CSS Variable Injection Example

When applying a design to the HTML template:

```css
:root {
    /* Injected from PdfDesignTemplate */
    --v-theme-primary-title: 2, 113, 184;        /* primary_title_color */
    --v-theme-secondary-title: 2, 113, 184;      /* secondary_title_color */
    --v-theme-primary-background: 214, 238, 253;  /* background_highlight_color */
}
```

```html
<!-- Logo slot -->
<img class="header__logo" src="data:image/png;base64,{logo_base64}" alt="Logo">

<!-- Banner slot -->
<div class="header__banner" style="background-image: url('data:image/png;base64,{banner_base64}');">
    <h1 class="header__title">{header_text resolved}</h1>
</div>

<!-- Watermark slot -->
<div class="layout__watermark-fixed">
    <img src="data:image/png;base64,{watermark_base64}" alt="Watermark">
</div>
```

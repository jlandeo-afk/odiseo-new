# Research: Plantillas PDF Personalizables

**Date**: 2026-06-27 (updated post-clarification)

## Research Questions & Decisions

### RQ1: ¿Qué librería usa el worker para generar PDFs y cómo se inyecta el diseño?

**Decision**: Playwright v1.61.1 con inyección de CSS variables RGB + imagen base64

**Rationale**: Ya está instalada y operativa en `pdf-generator.service.ts`. La plantilla real (`index.html`) usa CSS variables con valores RGB (no hex):
- `--v-theme-primary-title: R, G, B;`
- `--v-theme-secondary-title: R, G, B;`
- `--v-theme-primary-background: R, G, B;`

El diseño se inyecta modificando el bloque `:root` de CSS y los slots de imágenes en el HTML antes de pasarlo a Playwright. Las imágenes (logo, banner, watermark) se convierten a data URIs base64 para evitar dependencias externas durante la renderización.

**Alternatives considered**: 
- Hex colors (la implementación vieja usaba hex; la plantilla real usa RGB triplets)
- URLs externas para imágenes (problemas de CORS en Playwright headless)

**Impact**: El `DesignTemplateConfig` debe usar colores como `"R, G, B"` strings para inyectarse directamente en las CSS variables. Las imágenes deben descargarse de S3 y convertirse a base64 antes de la renderización.

---

### RQ2: ¿Cómo manejar el upload de assets a S3?

**Decision**: Endpoint NestJS con `@UseInterceptors(FileInterceptor)` + `multer`

**Rationale**: Ya implementado parcialmente en `PdfDesignService.uploadLogo()` y `uploadBackground()`. Se necesita extender para soportar 3 tipos de asset: logo, banner, watermark.

1. Frontend envía multipart `POST /pdf-designs/:id/upload-asset?type=logo|banner|watermark`
2. Backend recibe con `FileInterceptor`, valida formato/tamaño
3. Para logo: redimensiona con `sharp` (max-width preservando aspect ratio)
4. Sube a S3 vía `S3Service.uploadBuffer()`
5. Persiste la URL en `PdfDesignTemplate` (campo correspondiente)

**Alternatives considered**:
- Presigned PUT URL (más escalable, pero overkill para v1 con 2-5 assets por diseño)
- Base64 en JSONB (infla DB, no sirve CDN)
- Mantener endpoints separados por tipo (ya existe para logo/background; consolidar en uno genérico)

**Impact**: Consolidar endpoints de upload en uno genérico con query param `type`. Agregar soporte para watermark.

---

### RQ3: ¿Cómo generar la preview del diseño?

**Decision**: El backend interpola las CSS variables y slots del HTML template real (`index.html`) y lo devuelve como string. Frontend renderiza en un iframe sandboxed.

**Rationale**: 
- No necesita Playwright (solo interpolación de strings y variables CSS)
- Es síncrono y rápido (< 50ms)
- Usa el **mismo template HTML real** que Playwright usará para el PDF final → preview WYSIWYG
- No viola la Constitución (no es PDF, no usa Playwright)

**Dos contextos de preview**:
1. **En formulario de diseño**: El backend toma el diseño (guardado o overrides), inyecta en el template HTML con datos de ejemplo (curso "Aritmética", tema "Ejemplo"), devuelve HTML. Frontend muestra en iframe.
2. **Al seleccionar diseño en generación**: Mismo endpoint, pero opcionalmente se pasan datos reales del material (course_name, week_number, template_name).

**Endpoint**: `POST /pdf-designs/:id/preview` → `{ html: string }`

**Alternatives considered**:
- Playwright `page.screenshot()` (lento, requiere Chromium)
- Playwright `page.pdf()` (viola la Constitución)
- Renderizar en frontend puro (no tiene acceso al template del servidor)

**Impact**: El preview genera el HTML usando exactamente el template de `index.html` con las CSS variables y slots inyectados. El frontend muestra en `<iframe srcdoc="..." sandbox="allow-same-origin">`.

---

### RQ4: ¿Cómo mapean los campos de la entidad a la plantilla HTML real?

**Decision**: Mapeo directo a CSS variables y HTML slots

**Rationale**: La plantilla `index.html` define CSS variables específicas y slots HTML. El diseño se aplica inyectando valores en `:root` y reemplazando `src` de imágenes.

| Campo DB | Tipo | Template Target |
|----------|------|-----------------|
| `primary_title_color` | `varchar(20)` — ej. `"2, 113, 184"` | `:root { --v-theme-primary-title: VALUE; }` |
| `secondary_title_color` | `varchar(20)` — ej. `"2, 113, 184"` | `:root { --v-theme-secondary-title: VALUE; }` |
| `background_highlight_color` | `varchar(20)` — ej. `"214, 238, 253"` | `:root { --v-theme-primary-background: VALUE; }` |
| `logo_url` | `text` — S3 URL | `.header__logo` src (convertido a base64 para Playwright) |
| `banner_image_url` | `text` — S3 URL | `.header__banner` background-image |
| `watermark_image_url` | `text` — S3 URL | `.layout__watermark-fixed img` src |
| `header_text` | `text` — variables dinámicas | `.header__title` innerHTML |
| `footer_text` | `text` — variables dinámicas | Footer slot |

**Impact**: La migración debe cambiar `primary_color` (varchar(7) hex) a `primary_title_color` (varchar(20) RGB). Se eliminan campos del modelo viejo que no existen en el template real: `font_family`, `show_cover`, `show_frame`, `show_pagination`, `contact_info`.

# Research: Plantillas PDF Personalizables

**Date**: 2026-06-25

## Research Questions & Decisions

### RQ1: ¿Qué librería usa el worker para generar PDFs?

**Decision**: Playwright v1.61.1

**Rationale**: Ya está instalada y operativa en `pdf-generator.service.ts`. Lanza Chromium headless, recibe HTML con CSS inline, llama a `page.pdf()`. La personalización se inyecta como variables CSS + template strings antes de pasar el HTML a Playwright.

**Alternatives considered**: 
- Puppeteer (similar, requería instalación adicional)
- jsPDF / PDFKit (no soportaban HTML complejo ni CSS)
- wkhtmltopdf (deprecado)

**Impact**: El diseño se inyecta como:
  - CSS variables en un `<style>` block (`--primary-color`, `--font-family`, etc.)
  - Template strings para header, footer, portada
  - Logo y background como `<img src="...">`

---

### RQ2: ¿Cómo manejar el upload de assets a S3?

**Decision**: Endpoint NestJS con `@UseInterceptors(FileInterceptor)` + `multer`

**Rationale**: No existe infraestructura de upload hoy. Para imágenes pequeñas (<2MB, logo y fondo), un proxy clásico por backend es suficiente:
1. Frontend envía multipart `POST /pdf-designs/:id/upload-asset?type=logo`
2. Backend recibe con `FileInterceptor`, valida formato/tamaño
3. Sube a S3 vía `S3Service.uploadBuffer()`
4. Persiste la URL en `PdfDesignTemplate`
5. Devuelve la URL

**Alternatives considered**:
- Presigned PUT URL (más escalable, pero requiere lógica extra de firma + manejo de errores en frontend; overkill para v1)
- Base64 en JSONB (no recomendado: infla DB, no sirve CDN)
- URL externa (menos control, el usuario tendría que hostear sus imágenes)

**Impact**: Agregar `multer` como dependencia. Crear endpoint de upload. Validar tipo MIME y tamaño en el interceptor.

---

### RQ3: ¿Cómo generar la preview del diseño?

**Decision**: El backend arma el HTML con las variables del diseño inyectadas y lo devuelve como string. Frontend renderiza en un iframe sandboxed.

**Rationale**: 
- No necesita Playwright (solo interpolación de strings)
- Es síncrono y rápido (< 50ms)
- El frontend ya puede renderizar HTML directamente
- No viola la Constitución (no es PDF, no usa Playwright)

**Endpoint**: `POST /pdf-designs/:id/preview` → `{ html: string }`

**Alternatives considered**:
- Playwright `page.screenshot()` (lento, requiere Chromium, sobreingeniería para una preview)
- Playwright `page.pdf()` (viola la Constitución)
- Renderizar en frontend puro (no tiene acceso a los templates del servidor)

**Impact**: Crear un endpoint simple que interpola diseño + template HTML y devuelve el string. Frontend muestra en `<iframe srcdoc="...">` con estilos aislados.

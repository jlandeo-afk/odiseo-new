# API: Preview de Diseño

Base path (tenant schema): `/api/v1/pdf-designs`

---

## Generar preview (diseño guardado)

```
POST /api/v1/pdf-designs/:id/preview
```

**Headers**: `x-subdomain: {tenant}`

**Body**: Opcional — permite previsualizar overrides antes de guardar:
```json
{
  "primaryTitleColor": "220, 38, 38",
  "headerText": "Mi Header - {course_name}",
  "footerText": "Página {page} de {total}"
}
```

Si se envía body vacío, usa la configuración guardada del diseño.

**Response** `200`:
```json
{
  "html": "<!DOCTYPE html><html lang=\"es\">..."
}
```

**Descripción**: El HTML devuelto es el template real (`index.html`) con:
- CSS variables inyectadas en `:root` (`--v-theme-primary-title`, `--v-theme-secondary-title`, `--v-theme-primary-background`)
- Logo, banner y watermark como data URIs base64 (si existen)
- Header text y footer text resueltos con datos de ejemplo:
  - `{course_name}` → "ARITMÉTICA"
  - `{template_name}` → "EXAMEN PARCIAL"
  - `{week_number}` → "1"
  - `{cycle_name}` → "2026-1"
  - `{page}` → "1", `{total}` → "2"
- Preguntas de ejemplo (lorem ipsum) para mostrar la estructura del body

**Frontend**: Renderizar con `<iframe srcdoc="html" sandbox="allow-same-origin">`.

---

## Preview en contexto de generación

Para el selector de diseño al generar material, se puede pasar contexto real:

```
POST /api/v1/pdf-designs/:id/preview
```

**Body**:
```json
{
  "context": {
    "courseName": "MATEMÁTICAS",
    "weekNumber": 3,
    "templateName": "PRÁCTICA CALIFICADA"
  }
}
```

Si `context` está presente, las variables se resuelven con esos datos en vez de datos de ejemplo. El diseño se obtiene por ID.

**Response**: Same `{ html: string }`.

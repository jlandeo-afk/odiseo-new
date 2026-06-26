# API: Extensión de Generación de Material

---

## Generar material (extendido)

```
POST /api/v1/materials/generate
```

**Body actual + nuevo campo**:
```json
{
  "profile_id": "uuid",
  "week_number": 3,
  "requires_review": false,
  "courses": [{ "course_id": "uuid" }],
  "design_template_id": "uuid"
}
```

**`design_template_id`**: Opcional. Si se envía, el worker aplica ese diseño al PDF. Si no se envía o es `null`, se usa un diseño base del sistema (sin personalización).

---

## Job payload (extendido)

El worker recibe en el payload de BullMQ:

```json
{
  "tenantId": "...",
  "materialRequestId": "uuid",
  "profileId": "uuid",
  "weekNumber": 3,
  "courses": [...],
  "designTemplateId": "uuid"
}
```

**`designTemplateId`**: Opcional. Si presente, el worker fetchea `PdfDesignTemplate` de DB e inyecta los valores en el HTML antes de pasarlo a Playwright.

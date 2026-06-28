# API: CRUD de Diseños de PDF

Base path (tenant schema): `/api/v1/pdf-designs`

---

## Listar diseños

```
GET /api/v1/pdf-designs
```

**Headers**: `x-subdomain: {tenant}`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Diseño Institucional Azul",
      "logoUrl": "https://...",
      "bannerImageUrl": "https://...",
      "watermarkImageUrl": null,
      "primaryTitleColor": "2, 113, 184",
      "secondaryTitleColor": "2, 113, 184",
      "backgroundHighlightColor": "214, 238, 253",
      "headerText": "{template_name} - Semana {week_number}",
      "footerText": "Página {page} de {total}",
      "isDefault": true,
      "createdAt": "2026-06-27T00:00:00Z"
    }
  ]
}
```

---

## Obtener diseño

```
GET /api/v1/pdf-designs/:id
```

**Response** `200`: Single design object (same shape as list item)

---

## Crear diseño

```
POST /api/v1/pdf-designs
```

**Body**:
```json
{
  "name": "Diseño Institucional Azul",
  "primaryTitleColor": "2, 113, 184",
  "secondaryTitleColor": "2, 113, 184",
  "backgroundHighlightColor": "214, 238, 253",
  "headerText": "{template_name} - Semana {week_number}",
  "footerText": "Página {page} de {total}",
  "isDefault": false
}
```

**Response** `201`: Created design object (with id).

**Validation**:
- `name`: required, max 255 chars, unique per tenant
- `primaryTitleColor`: optional, RGB format `"R, G, B"` (each 0-255)
- `secondaryTitleColor`: optional, RGB format
- `backgroundHighlightColor`: optional, RGB format
- `headerText`, `footerText`: optional, text
- `isDefault`: if `true`, system unsets previous default for tenant
- If first design for tenant, `isDefault` is set to `true` automatically

---

## Actualizar diseño

```
PATCH /api/v1/pdf-designs/:id
```

**Body**: Same shape as create, all fields optional (partial update).

**Response** `200`: Updated design object.

---

## Eliminar diseño

```
DELETE /api/v1/pdf-designs/:id
```

**Response** `204`: No content.

**Behavior**: 
- Sets `design_template_id = NULL` on referencing MaterialRequests.
- If deleted design was default, no design is auto-promoted to default (system uses base HTML without customization).

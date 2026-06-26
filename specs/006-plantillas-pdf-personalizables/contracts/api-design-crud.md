# API: CRUD de Plantillas de Diseño

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
      "name": "Diseño Universidad del Norte",
      "logoUrl": "https://...",
      "primaryColor": "#1a56db",
      "fontFamily": "Arial",
      "headerText": "Universidad del Norte - {course_name}",
      "footerText": "Página {page} de {total}",
      "showCover": true,
      "backgroundUrl": null,
      "showPagination": true,
      "showFrame": true,
      "contactInfo": "info@unorte.edu.ec | Telf: 123456789",
      "isDefault": true,
      "createdAt": "2026-06-25T00:00:00Z"
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
  "name": "Diseño Universidad del Norte",
  "primaryColor": "#1a56db",
  "fontFamily": "Arial",
  "headerText": "Universidad del Norte - {course_name}",
  "footerText": "Página {page} de {total}",
  "showCover": true,
  "showPagination": true,
  "showFrame": true,
  "contactInfo": "info@unorte.edu.ec | Telf: 123456789",
  "isDefault": false
}
```

**Response** `201`: Created design object (with id).

**Validation**:
- `name`: required, max 255 chars
- `primaryColor`: optional, must match `^#[0-9A-Fa-f]{6}$`
- `showCover`, `showPagination`, `showFrame`: boolean, default `true`
- `isDefault`: if `true`, system unsets previous default for tenant

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
- Cannot delete the last default design for tenant (error 422).
- Sets `design_template_id = NULL` on referencing MaterialRequests.

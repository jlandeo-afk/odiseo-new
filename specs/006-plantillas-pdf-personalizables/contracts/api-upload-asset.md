# API: Upload de Assets de Diseño

Base path (tenant schema): `/api/v1/pdf-designs`

---

## Subir logo

```
POST /api/v1/pdf-designs/:id/upload-logo
```

**Headers**: `x-subdomain: {tenant}`
**Content-Type**: `multipart/form-data`

**Form field**: `file` — imagen PNG o JPG, máximo 2MB

**Response** `200`:
```json
{
  "logoUrl": "https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant}/{design_id}-logo.png"
}
```

**Validation**:
- MIME type: `image/png` o `image/jpeg`
- Max size: 2MB
- Dimensiones: se redimensiona automáticamente (server-side) a 200px de ancho máximo

---

## Subir fondo

```
POST /api/v1/pdf-designs/:id/upload-background
```

**Headers**: `x-subdomain: {tenant}`
**Content-Type**: `multipart/form-data`

**Form field**: `file` — imagen PNG o JPG, máximo 2MB

**Response** `200`:
```json
{
  "backgroundUrl": "https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant}/{design_id}-background.png"
}
```

---

## Eliminar asset

```
DELETE /api/v1/pdf-designs/:id/asset?type=logo|background
```

**Response** `204`: No content.

**Behavior**: Removes file from S3, sets URL to null in entity.

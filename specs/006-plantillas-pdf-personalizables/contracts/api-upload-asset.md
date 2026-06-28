# API: Upload de Assets de Diseño

Base path (tenant schema): `/api/v1/pdf-designs`

---

## Subir asset (genérico)

```
POST /api/v1/pdf-designs/:id/upload-asset?type=logo|banner|watermark
```

**Headers**: `x-subdomain: {tenant}`
**Content-Type**: `multipart/form-data`

**Query param**: `type` — one of `logo`, `banner`, `watermark`

**Form field**: `file` — imagen PNG o JPG, máximo 2MB

**Response** `200`:
```json
{
  "url": "https://{bucket}.s3.{region}.amazonaws.com/designs/{tenant}/{design_id}-{type}.png"
}
```

**Validation**:
- MIME type: `image/png` o `image/jpeg`
- Max size: 2MB
- For `logo`: se redimensiona automáticamente (server-side via `sharp`) a un ancho máximo preservando aspect ratio
- For `banner` / `watermark`: se sube sin redimensionar (las dimensiones son responsabilidad del usuario)

**S3 Key pattern**: `designs/{tenant_id}/{design_id}-{type}.png`

**Entity update by type**:
| type | Field updated |
|------|--------------|
| `logo` | `logoUrl` |
| `banner` | `bannerImageUrl` |
| `watermark` | `watermarkImageUrl` |

---

## Eliminar asset

```
DELETE /api/v1/pdf-designs/:id/asset?type=logo|banner|watermark
```

**Response** `204`: No content.

**Behavior**: Sets the corresponding URL field to null in entity. Does NOT delete from S3 (can be cleaned up by a scheduled job later if needed).

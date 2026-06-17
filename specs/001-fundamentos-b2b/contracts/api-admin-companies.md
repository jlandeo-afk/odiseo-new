# Contract: POST /api/v1/admin/companies

**Type**: Authenticated (requires super-admin role)

## Request

```
POST /api/v1/admin/companies
Cookie: jwt=eyJhbGci...
Content-Type: application/json
```

```json
{
  "subdomain": "nuevo-colegio",
  "commercial_name": "Colegio Nuevo Horizonte",
  "logo_url": "https://s3.aws.com/tenant-assets/nuevo-horizonte.png",
  "primary_color": "#4caf50"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| subdomain | string | Yes | Unique, lowercase, alphanumeric + hyphens, 3-30 chars |
| commercial_name | string | Yes | 1-200 chars |
| logo_url | string | No | Valid URL format |
| primary_color | string | No | Hex color format `#RRGGBB`, defaults to `#6366f1` |

## Response 201 Created

```json
{
  "id": "uuid-company-new",
  "subdomain": "nuevo-colegio",
  "commercial_name": "Colegio Nuevo Horizonte",
  "logo_url": "https://s3.aws.com/tenant-assets/nuevo-horizonte.png",
  "primary_color": "#4caf50",
  "schema_name": "tenant_uuid-company-new",
  "created_at": "2026-06-16T20:00:00Z"
}
```

## Response 409 Conflict

```json
{
  "statusCode": 409,
  "message": "The subdomain 'nuevo-colegio' is already registered",
  "error": "Conflict"
}
```

## Response 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Solo super-administradores pueden crear empresas",
  "error": "Forbidden"
}
```

## Side Effects

1. Creates record in `public.companies`
2. Executes `CREATE SCHEMA tenant_<company_id>`
3. Runs base tenant migrations (users, roles, permissions tables)
4. Seeds default V1 role `admin` with all permissions

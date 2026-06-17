# Contract: POST /api/v1/auth/login

**Type**: Public (no auth required)

## Request

```
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@colegio.com",
  "password": "securepassword",
  "subdomain": "colegio"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 8 characters |
| subdomain | string | Yes | Alphanumeric + hyphens, 3-30 chars |

## Response 200 OK

**Headers**:
```
Set-Cookie: jwt=eyJhbGci...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

**Body**:
```json
{
  "user": {
    "id": "uuid-admin-1",
    "email": "admin@colegio.com",
    "name": "Admin Colegio",
    "companyId": "uuid-company-A",
    "roles": ["admin"],
    "permissions": [
      "view_catalogs",
      "edit_catalogs",
      "view_materials",
      "generate_material",
      "review_material",
      "view_syllabus",
      "edit_syllabus",
      "manage_academic_time"
    ]
  }
}
```

## Response 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid credentials or unauthorized access for this subdomain",
  "error": "Unauthorized"
}
```

## Validation Logic

1. Resolve `company_id` from `subdomain` via `public.companies`
2. Set `search_path` to tenant schema
3. Find user by `email` in tenant schema
4. Validate password with bcrypt
5. Assert `user.company_id === tenant.company_id` (cross-tenant isolation)
6. Generate JWT with claims: `{ sub: user.id, company_id, roles, permissions }`
7. Set JWT as httpOnly cookie

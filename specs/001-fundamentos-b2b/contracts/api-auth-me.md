# Contract: GET /api/v1/auth/me

**Type**: Authenticated (requires valid JWT cookie)

## Request

```
GET /api/v1/auth/me
Cookie: jwt=eyJhbGci...
```

No body or query parameters required. The JWT cookie is sent automatically by the browser.

## Response 200 OK

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
  "message": "Token expirado o inválido",
  "error": "Unauthorized"
}
```

## Notes

- This endpoint is the primary mechanism for session rehidration after page refresh.
- The frontend calls this in a Nuxt plugin or middleware on app initialization.
- If 401, the frontend redirects to `/login`.

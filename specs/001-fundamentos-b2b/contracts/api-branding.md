# Contract: GET /api/v1/tenants/branding

**Type**: Public (no auth required)

## Request

```
GET /api/v1/tenants/branding?subdomain={subdomain}
```

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| subdomain | query | string | Yes | Subdomain of the tenant (e.g., "colegio") |

## Response 200 OK

```json
{
  "commercialName": "Colegio Innovador",
  "logoUrl": "https://s3.aws.com/tenant-assets/logo.png",
  "primaryColor": "#1e88e5"
}
```

## Response 200 OK (unknown subdomain — default branding)

```json
{
  "commercialName": "Odiseo B2B Default",
  "logoUrl": null,
  "primaryColor": "#6366f1"
}
```

## Notes

- This endpoint NEVER returns 404. Unknown subdomains get default branding.
- Queried from `public.companies` table.

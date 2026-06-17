# Contract: Academic Time API

## POST /api/v1/academic-time/cycles

**Type**: Authenticated (requires `manage_academic_time` permission)

Creates a new cycle with auto-generated weeks.

### Request

```json
{
  "name": "Ciclo 2026-I",
  "year": 2026,
  "startDate": "2026-03-01",
  "totalWeeks": 16,
  "daysPerWeek": 5
}
```

### Response 201 Created

```json
{
  "id": "uuid-cycle-1",
  "name": "Ciclo 2026-I",
  "year": 2026,
  "startDate": "2026-03-01",
  "endDate": "2026-06-20",
  "totalWeeks": 16,
  "daysPerWeek": 5,
  "isActive": true,
  "weeks": [
    { "id": "uuid-w1", "weekNumber": 1, "startDate": "2026-03-01", "endDate": "2026-03-07", "isActive": true },
    { "id": "uuid-w2", "weekNumber": 2, "startDate": "2026-03-08", "endDate": "2026-03-14", "isActive": true }
  ]
}
```

## GET /api/v1/academic-time/cycles

**Type**: Authenticated

Returns all cycles for the tenant.

## PATCH /api/v1/academic-time/weeks/:id

**Type**: Authenticated (requires `manage_academic_time`)

Soft-delete (deactivate) a week.

### Request

```json
{ "isActive": false }
```

### Response 200 OK

```json
{ "id": "uuid-w8", "weekNumber": 8, "isActive": false }
```

## DELETE /api/v1/academic-time/weeks/:id

**PROHIBITED** — Returns 405 Method Not Allowed.

```json
{
  "statusCode": 405,
  "message": "La eliminación física de semanas está prohibida. Use PATCH para desactivar.",
  "error": "Method Not Allowed"
}
```

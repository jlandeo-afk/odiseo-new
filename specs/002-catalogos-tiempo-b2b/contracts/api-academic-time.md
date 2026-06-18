# Contract: Academic Time API

## POST /api/v1/academic-time/cycles

**Type**: Authenticated (requires `manage_academic_time` permission)

Creates a new cycle with auto-generated weeks based on the exact 7-day cadence calculation.

### Request

```json
{
  "name": "Ciclo Regular 2026",
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
  "name": "Ciclo Regular 2026",
  "year": 2026,
  "startDate": "2026-03-01",
  "endDate": "2026-06-20",
  "totalWeeks": 16,
  "daysPerWeek": 5,
  "isActive": true,
  "weeks": [
    { "id": "uuid-w1", "weekNumber": 1, "startDate": "2026-03-01", "endDate": "2026-03-05", "isActive": true },
    { "id": "uuid-w2", "weekNumber": 2, "startDate": "2026-03-08", "endDate": "2026-03-12", "isActive": true }
  ]
}
```

*(Note: Week 2 starts exactly 7 days after Week 1. End dates are calculated as start_date + daysPerWeek - 1)*

## GET /api/v1/academic-time/cycles

**Type**: Authenticated

Returns all cycles for the tenant, including overlapping ones.

## PATCH /api/v1/academic-time/cycles/:id/visibility

**Type**: Authenticated (requires `manage_academic_time`)

Deactivate a cycle (soft delete equivalent).

### Request

```json
{ "isActive": false }
```

## PATCH /api/v1/academic-time/weeks/:id/visibility

**Type**: Authenticated (requires `manage_academic_time`)

Soft-delete (deactivate) a specific week.

### Request

```json
{ "isActive": false }
```

## DELETE /api/v1/academic-time/cycles/:id

**Type**: Authenticated (requires `manage_academic_time`)

Deletes a cycle ONLY if it has no related syllabus.

### Response 200 OK (Success)
```json
{ "success": true, "message": "Ciclo eliminado" }
```

### Response 409 Conflict (Failed due to relations)
```json
{
  "statusCode": 409,
  "message": "No se puede eliminar el ciclo porque ya tiene sílabos asociados. Puede desactivarlo en su lugar.",
  "error": "Conflict"
}
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

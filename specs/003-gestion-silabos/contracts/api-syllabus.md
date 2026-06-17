# Contract: Syllabus API

## POST /api/v1/syllabus

Creates a new syllabus for a course + cycle.

### Request
```json
{ "name": "Sílabo Álgebra 2026-I", "courseId": "uuid-course", "cycleId": "uuid-cycle" }
```

### Response 201
```json
{ "id": "uuid-syl", "name": "Sílabo Álgebra 2026-I", "courseId": "...", "cycleId": "...", "isActive": true, "distributions": [] }
```

## GET /api/v1/syllabus/:id

Returns syllabus with all distributions.

## POST /api/v1/syllabus/:id/distributions

### Request
```json
{ "weekNumber": 3, "topicId": "uuid-topic", "subtopicId": "uuid-subtopic", "requestedQuantity": 5 }
```

## PATCH /api/v1/syllabus/:id/distributions/:distId

### Request
```json
{ "requestedQuantity": 3 }
```

## DELETE /api/v1/syllabus/:id/distributions/:distId

Removes a distribution entry. Returns 204 No Content.

## GET /api/v1/syllabus/:id/summary

Returns matrix summary: weeks × topics with totals.

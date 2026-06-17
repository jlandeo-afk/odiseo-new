# Contract: Material Generation API

## POST /api/v1/materials/generate

**Type**: Authenticated (requires `generate_material`)

### Request
```json
{
  "materialType": "BALOTARIO",
  "syllabusId": "uuid-syl",
  "weekNumber": 3,
  "requiresReview": true,
  "examAreas": []
}
```

### Response 202 Accepted
```json
{ "jobId": "uuid-job", "status": "PENDING", "message": "Material queued for generation" }
```

### Response 400 Bad Request (no distribution for week)
```json
{ "statusCode": 400, "message": "No hay distribución configurada para la semana seleccionada" }
```

## GET /api/v1/materials/:id/review

Returns the review data for a material in REVIEW_REQUIRED status.

### Response 200
```json
{
  "materialId": "uuid-job",
  "status": "REVIEW_REQUIRED",
  "questions": [
    { "id": "uuid-rq1", "questionId": "core-q-1", "topicName": "Álgebra", "subtopicName": "Ecuaciones", "position": 1, "status": "FOUND" },
    { "id": "uuid-rq2", "questionId": null, "topicName": "Álgebra", "subtopicName": "Inecuaciones", "position": 2, "status": "EMPTY" }
  ],
  "warnings": { "shortages": [{ "subtopic": "Inecuaciones", "requested": 5, "found": 3 }] }
}
```

## POST /api/v1/materials/:id/approve

Approves the review and triggers final PDF generation.

### Request
```json
{ "continueWithWarnings": true }
```

### Response 202
```json
{ "status": "PROCESSING", "message": "PDF generation started" }
```

## WebSocket Events

- `material.generation.completed` → `{ jobId, downloadUrl }`
- `material.generation.failed` → `{ jobId, error }`
- `material.review.required` → `{ jobId }`

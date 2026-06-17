# Contract: History & Traceability API

## GET /api/v1/materials/history

Returns paginated history of generated materials.

### Query Params
| Param | Type | Description |
|-------|------|-------------|
| page | number | Default 1 |
| limit | number | Default 20 |
| materialType | enum | Filter: BALOTARIO, EXAMEN |
| courseId | uuid | Filter by course |
| status | enum | Filter by status |
| from | date | Start date range |
| to | date | End date range |

### Response 200
```json
{
  "items": [
    {
      "id": "uuid-job",
      "materialType": "BALOTARIO",
      "courseName": "Álgebra",
      "weekNumber": 3,
      "status": "COMPLETED",
      "downloadUrl": "https://s3.../presigned",
      "createdBy": "Admin Colegio",
      "createdAt": "2026-06-16T20:00:00Z",
      "warnings": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

## GET /api/v1/materials/:id/questions

Returns questions used in a specific material.

### Response 200
```json
{
  "questions": [
    { "questionId": "core-q-1", "topicName": "Álgebra", "subtopicName": "Ecuaciones", "position": 1, "wasReplacement": false }
  ]
}
```

## POST /api/v1/materials/:id/regenerate-url

Regenerates expired S3 presigned URL.

### Response 200
```json
{ "downloadUrl": "https://s3.../new-presigned-url" }
```

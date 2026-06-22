# Contract: Material Generation API

## POST /api/v1/materials/generate

Encola una solicitud de generación para todos los cursos del perfil y semana seleccionados.

**Type**: Authenticated (requires `generate_material` permission)

### Request
```json
{
  "profileId": "uuid-profile-123",
  "weekNumber": 3,
  "requiresReview": true,
  "examAreas": []
}
```

### Response 202 Accepted
```json
{
  "jobId": "uuid-job-456",
  "status": "PENDING",
  "message": "Solicitud de material encolada exitosamente",
  "courses": [
    { "courseId": "algebra-uuid", "status": "PENDING" },
    { "courseId": "fisica-uuid", "status": "PENDING" }
  ]
}
```

### Response 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "No hay distribución de sílabo configurada para la semana seleccionada"
}
```

---

## GET /api/v1/materials/:id/review

Obtiene las preguntas de revisión para un material. Al invocar este endpoint por primera vez, el estado del material cambia automáticamente a `IN_REVIEW`.

**Type**: Authenticated (requires `review_material` permission)

### Response 200 OK
```json
{
  "materialId": "uuid-job-456",
  "status": "IN_REVIEW",
  "version": 1,
  "questions": [
    {
      "id": "uuid-rq1",
      "questionId": "core-q-101",
      "courseId": "algebra-uuid",
      "topicName": "Ecuaciones",
      "subtopicName": "Lineales",
      "position": 1,
      "status": "FOUND"
    },
    {
      "id": "uuid-rq2",
      "questionId": null,
      "courseId": "algebra-uuid",
      "topicName": "Ecuaciones",
      "subtopicName": "Cuadráticas",
      "position": 2,
      "status": "EMPTY"
    }
  ]
}
```

### Response 409 Conflict (Edición concurrente)
```json
{
  "statusCode": 409,
  "message": "El material ya está siendo revisado por otro administrador o su estado ha cambiado"
}
```

---

## POST /api/v1/materials/:id/approve

Prueba la revisión, guarda las decisiones finales (reemplazos, eliminaciones de slots) y gatilla el inicio del procesamiento final por el Worker.

**Type**: Authenticated (requires `review_material` permission)

### Request
```json
{
  "version": 1,
  "continueWithWarnings": true,
  "replacements": [
    { "reviewQuestionId": "uuid-rq2", "questionId": "core-q-205" }
  ],
  "removals": [
    "uuid-rq3"
  ]
}
```

### Response 202 Accepted
```json
{
  "status": "PROCESSING",
  "message": "Generación de PDFs iniciada"
}
```

---

## GET /api/v1/materials/:id/courses/:courseId/download

Obtiene la URL pre-firmada de descarga para un curso específico. Si la URL guardada en la base de datos ha expirado, el backend NestJS generará una nueva y la retornará.

**Type**: Authenticated (requires `download_material` permission)

### Response 200 OK
```json
{
  "materialId": "uuid-job-456",
  "courseId": "algebra-uuid",
  "downloadUrl": "https://s3.amazonaws.com/odiseo-materials/algebra.pdf?AWSAccessKeyId=...&Expires=...",
  "expiresIn": 86400
}
```

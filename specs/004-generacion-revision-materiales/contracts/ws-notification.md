# Contract: WebSocket - Notificación de Materiales

Eventos emitidos vía AWS API Gateway WebSockets desde el Worker / NestJS hacia el cliente frontend.

## Evento: `material.generation.completed`

Emitido cuando el Worker FastAPI completa satisfactoriamente la compilación en PDF y lo sube a S3.

**Payload:**
```json
{
  "event": "material.generation.completed",
  "data": {
    "material_request_id": "uuid-de-la-solicitud",
    "course_id": "math-101",
    "status": "COMPLETED",
    "download_url": "https://s3.amazonaws.com/.../file.pdf?sig=..."
  }
}
```

## Evento: `material.generation.warnings`

Emitido cuando se completa el material pero hubo vacíos (Core API devolvió menos preguntas de las solicitadas).

**Payload:**
```json
{
  "event": "material.generation.warnings",
  "data": {
    "material_request_id": "uuid-de-la-solicitud",
    "course_id": "math-101",
    "status": "COMPLETED_WITH_WARNINGS",
    "download_url": "https://s3.amazonaws.com/.../file.pdf?sig=...",
    "warnings": [
      {
        "topic_id": "t1",
        "subtopic_id": "st1",
        "message": "Se solicitaron 5 preguntas pero solo se encontraron 3 disponibles."
      }
    ]
  }
}
```

## Evento: `material.generation.failed`

Emitido si el Worker no pudo conectarse al Core API tras los reintentos, o falló la compilación WeasyPrint.

**Payload:**
```json
{
  "event": "material.generation.failed",
  "data": {
    "material_request_id": "uuid-de-la-solicitud",
    "course_id": "math-101",
    "status": "FAILED",
    "error_message": "Core API timeout después de 3 intentos"
  }
}
```

## Evento: `material.review.required`

Emitido si el admin solicitó validación manual antes de generar el PDF (`requires_review: true`).

**Payload:**
```json
{
  "event": "material.review.required",
  "data": {
    "material_request_id": "uuid-de-la-solicitud",
    "status": "REVIEW_REQUIRED",
    "message": "Preguntas extraídas. Requiere revisión manual."
  }
}
```

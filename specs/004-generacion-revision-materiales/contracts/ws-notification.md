# Contract: WebSocket Notifications

Las notificaciones en tiempo real se canalizan a través de **AWS API Gateway WebSockets** (según la Restricción CR-003).

## 1. Evento: Revisión Requerida

Emitido por el Worker FastAPI tras finalizar el análisis inicial del banco de preguntas y detectar que la solicitud requiere revisión humana.

**Topic**: `material.review.required`

```json
{
  "event": "material.review.required",
  "data": {
    "job_id": "uuid-job-456",
    "status": "REVIEW_REQUIRED",
    "message": "La extracción inicial ha terminado. El material está listo para revisión."
  }
}
```

---

## 2. Evento: Generación Completada

Emitido cuando todos los cursos de la solicitud han sido procesados y subidos a S3 (o al menos uno se completó con advertencias).

**Topic**: `material.generation.completed`

```json
{
  "event": "material.generation.completed",
  "data": {
    "job_id": "uuid-job-456",
    "status": "COMPLETED",
    "courses": [
      {
        "course_id": "algebra-uuid",
        "status": "COMPLETED"
      },
      {
        "course_id": "fisica-uuid",
        "status": "COMPLETED_WITH_WARNINGS",
        "warnings": ["Faltan 2 preguntas de Estática, se generó con 8 de 10 solicitadas"]
      }
    ]
  }
}
```

---

## 3. Evento: Generación Fallida

Emitido si ocurre un error irrecuperable en la generación de todos los cursos del material.

**Topic**: `material.generation.failed`

```json
{
  "event": "material.generation.failed",
  "data": {
    "job_id": "uuid-job-456",
    "status": "FAILED",
    "error_message": "Error crítico al compilar los documentos PDF en WeasyPrint: Timeout al renderizar las imágenes de las preguntas."
  }
}
```

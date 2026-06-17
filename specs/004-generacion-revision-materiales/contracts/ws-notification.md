# Contract: WebSocket Notification

Define el contrato del evento WebSocket que el cliente frontend (Vue.js/Nuxt) recibirá cuando el Worker finalice la generación asíncrona y reporte su culminación a través de AWS API Gateway.

## Success Event

Emitido cuando el PDF se ha generado, ensamblado (con todos sus cuadernillos, si aplica) y ha sido subido satisfactoriamente a S3.

**Event Topic**: `material.generation.completed`

```json
{
  "event": "material.generation.completed",
  "data": {
    "job_id": "84a3-4b92-b6f7-112233445566",
    "material_type": "EXAMEN",
    "status": "success",
    "download_url": "https://s3.aws.com/materials/.../examen_firmado.pdf?X-Amz-Signature=...",
    "expires_in": 3600
  }
}
```

## Failure Event

Emitido si ocurre un error lógico (ej. sin reactivos suficientes en el Core API) o de infraestructura durante la compilación en Fargate.

**Event Topic**: `material.generation.failed`

```json
{
  "event": "material.generation.failed",
  "data": {
    "job_id": "84a3-4b92-b6f7-112233445566",
    "status": "error",
    "error_message": "No hay suficientes reactivos disponibles para los filtros seleccionados en el Banco de Preguntas global."
  }
}
```

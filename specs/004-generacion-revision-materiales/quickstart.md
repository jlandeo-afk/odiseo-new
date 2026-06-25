# Quickstart: Validación End-to-End

Esta guía describe cómo verificar localmente la generación de material con las reglas anti-repetición aplicadas.

## Requisitos Previos

1. Instalar LocalStack para simular SQS y S3 localmente.
2. Levantar los servicios backend (NestJS) y el worker (FastAPI).
3. Asegurar que existe un `cycle_id` activo con un `cycle_material_profile` configurado.

## Escenario 1: Generación Feliz (Sin repeticiones previas)

1. Enviar una petición HTTP `POST /api/v1/materials/generate`
   - Parámetros: `profile_id` válido, `requires_review: false`.
2. Verificar HTTP 202 Accepted.
3. Observar los logs del Worker FastAPI: "Processing SQS message..."
4. Verificar la recepción del evento WebSocket `material.generation.completed` en el cliente de prueba.
5. Descargar el PDF mediante la `download_url` proporcionada en el evento.
6. **Auditoría:** Revisar en PostgreSQL que la tabla `material_question_usage` tenga registros insertados para las preguntas de este material, asociadas a su `cycle_id`.

## Escenario 2: Generación con Exclusión y Vacíos (Strict)

1. Volver a ejecutar el Escenario 1 para el mismo curso.
2. Como las preguntas ya están registradas en `material_question_usage`, el backend las incluirá en el array `exclude_question_ids` del payload de SQS.
3. Si el Core API se queda sin preguntas disponibles (retorna 0), el Worker debe emitir el evento `material.generation.warnings` (estado `COMPLETED_WITH_WARNINGS`).
4. **Validación:** El PDF final NO debe contener preguntas repetidas del Escenario 1. El log de advertencias debe mostrar el "vacío" donde no hubo stock disponible en el banco.

## Escenario 3: Generación con Revisión Concurrente (Bloqueo Optimista)

1. Enviar petición de generación con `requires_review: true`.
2. Esperar evento WS `material.review.required`.
3. Simular que el Usuario A llama a `PUT /api/v1/materials/{id}/review/approve`.
4. Simular que el Usuario B llama concurrentemente a `PUT /api/v1/materials/{id}/review/question-replace`.
5. **Validación:** El backend debe responder HTTP 409 Conflict a la petición del Usuario B, asegurando que el estado `IN_REVIEW` no fue sobrescrito accidentalmente.

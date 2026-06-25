# Data Model: Generación y Trazabilidad de Materiales

## Entidades Principales

### `material_requests`
Solicitud principal de generación iniciada por un administrador.
- `id` (UUID, PK)
- `tenant_id` (String) - Soporte multi-tenant
- `profile_id` (UUID, FK -> cycle_material_profiles) - Reglas de generación
- `cycle_id` (UUID) - Necesario para acotar reglas anti-repetición de la Spec 005
- `week_number` (Integer)
- `status` (Enum: PENDING, IN_REVIEW, PROCESSING, REVIEW_REQUIRED, COMPLETED, COMPLETED_WITH_WARNINGS, FAILED)
- `requires_review` (Boolean)
- `created_by` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### `material_request_courses`
Granularidad por curso de una solicitud (una solicitud puede involucrar múltiples cursos).
- `id` (UUID, PK)
- `material_request_id` (UUID, FK -> material_requests)
- `course_id` (String)
- `status` (Enum: PENDING, PROCESSING, COMPLETED, COMPLETED_WITH_WARNINGS, FAILED)
- `download_url` (String, nullable) - Presigned URL
- `warnings` (JSONB, nullable) - Registro de vacíos o faltantes
- `created_at` (Timestamp)

### `material_review_questions`
Preguntas individuales pre-seleccionadas que esperan revisión manual o confirmación.
- `id` (UUID, PK)
- `material_request_id` (UUID, FK -> material_requests)
- `question_id` (String) - Referencia al Core API
- `topic_id` (String)
- `subtopic_id` (String)
- `position` (Integer) - Posición en el PDF
- `status` (Enum: FOUND, EMPTY, REPLACED, REMOVED)

### `material_question_usage` (Trazabilidad - Spec 005)
Historial estricto de uso para prevenir repetición en el mismo ciclo.
- `id` (UUID, PK)
- `material_request_id` (UUID, FK -> material_requests)
- `cycle_id` (UUID) - Desnormalizado para agilizar el query de exclusión
- `question_id` (String)
- `course_id` (String)
- `topic_id` (String)
- `subtopic_id` (String)
- `position_in_pdf` (Integer)
- `was_replacement` (Boolean)
- `used_at` (Timestamp)

*Nota: Requiere un índice compuesto en `(cycle_id, course_id, question_id)` para asegurar eficiencia en la validación anti-repetición.*

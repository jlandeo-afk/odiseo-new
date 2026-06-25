# Feature Specification: Historial y Trazabilidad de Materiales

**Feature Branch**: `005-historial-trazabilidad`

**Created**: 2026-06-16

**Status**: Draft

## Context

Este módulo provee el historial de materiales generados y las reglas de negocio para evitar la repetición de preguntas entre materiales. Cada vez que se genera un material, se registra qué preguntas fueron utilizadas. Al solicitar un nuevo material, el sistema consulta este historial para excluir preguntas ya usadas recientemente, garantizando variedad en los contenidos evaluativos.

**Out of Scope**:
- Reportes analíticos sobre el uso de preguntas (ej. "top preguntas más usadas", "subtopics con menor rotación"). Los reportes son una feature separada.

## Clarifications

### Session 2026-06-24

- Q: ¿Qué modelo de autorización rige quién puede acceder al historial y consultar preguntas usadas? → A: Se difiere a una spec de permisos/roles separada; aquí solo se marca como dependencia.
- Q: ¿Cuándo se agota el pool de un subtopic, se debe forzar una repetición (soft reset)? → A: No. La exclusión es estricta. Si el pool se agota, el Core API retorna 0 preguntas para ese subtopic y se maneja como un "vacío" en la pantalla de Revisión de Materiales (Spec 004). Nunca se repiten preguntas automáticamente.
- Q: ¿La Spec 005 incluye reportes analíticos sobre uso de preguntas o se limita a historial + anti-repetición? → A: Solo historial + anti-repetición. Los reportes analíticos son una feature separada.
- Q: ¿La ventana de exclusión se cuenta por curso individual o por la combinación curso + tipo de material (BALOTARIO vs EXAMEN)? ¿Cuándo quedan libres? → A: Por curso dentro del mismo Ciclo Académico, sin importar el tipo de material. Una pregunta usada en un balotario no saldrá en el examen de ese mismo ciclo. Quedan libres automáticamente al iniciar un nuevo ciclo académico.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualización de Historial de Materiales (Priority: P1)

Como administrador del tenant, quiero ver un historial de todos los materiales generados, incluyendo fecha, tipo, curso, quién lo generó, estado y link de descarga, para tener trazabilidad completa de los documentos producidos.

**Independent Test**: Generación de 3 materiales distintos. Acceso a la vista de historial y verificación de que los 3 aparecen con todos sus campos. Verificación de que el link de descarga funciona para materiales completados. Verificación de que materiales fallidos muestran el motivo del error.

**Acceptance Scenarios**:

1. **Given** materiales generados en el tenant, **When** el admin accede a la vista de historial, **Then** se muestra una tabla con: fecha de creación, tipo de material (BALOTARIO/EXAMEN), curso, semana, estado (COMPLETED/FAILED/REVIEW_REQUIRED), quién lo generó, y link de descarga (si aplica).
2. **Given** un material con estado `COMPLETED_WITH_WARNINGS`, **When** el admin lo visualiza en el historial, **Then** se muestra un indicador de advertencias con el desglose de faltantes expandible.
3. **Given** un material cuya URL de S3 ha expirado, **When** el admin solicita descargarlo, **Then** el sistema regenera una URL pre-firmada válida y proporciona el nuevo enlace.

---

### User Story 2 - Reglas Anti-Repetición de Preguntas (Priority: P1)

Como sistema, necesito registrar qué preguntas (`question_id`) fueron utilizadas en cada material generado, para que al solicitar un nuevo material, las preguntas ya usadas recientemente sean excluidas del pool de selección, garantizando variedad en los contenidos evaluativos.

**Independent Test**: Generación de un material con 10 preguntas. Verificación de que las 10 `question_id` se registraron en la tabla de tracking. Solicitud de un nuevo material para el mismo curso/semana y verificación de que las 10 preguntas anteriores fueron excluidas del payload enviado al Core API.

**Acceptance Scenarios**:

1. **Given** un material generado con un conjunto de preguntas, **When** el sistema registra las preguntas usadas, **Then** se persiste un registro por cada `question_id` en la tabla `material_question_usage` con el `material_request_id` y la fecha de uso.
2. **Given** un historial de preguntas usadas para un curso, **When** se solicita un nuevo material para el mismo curso, **Then** el backend incluye la lista de `question_id` a excluir en el payload de SQS para que el Worker las envíe como filtro al Core API.
3. **Given** que todas las preguntas de un subtopic ya fueron usadas (pool agotado) en el ciclo actual, **When** se solicita un nuevo material, **Then** el sistema aplica exclusión estricta: el Core API retorna 0 preguntas para ese subtopic y el Worker lo procesa como un "vacío" (espacio sin pregunta) delegando la resolución a la Revisión de Material (Spec 004).

---

### User Story 3 - Consulta de Preguntas Usadas por Material (Priority: P2)

Como administrador, quiero poder ver qué preguntas específicas fueron incluidas en un material generado, para auditoría y para verificar que no haya repeticiones no deseadas.

**Independent Test**: Acceso al detalle de un material en el historial. Verificación de que se muestra la lista de `question_id` usadas, agrupadas por tema/subtema, con la posición que ocuparon en el PDF.

**Acceptance Scenarios**:

1. **Given** un material completado, **When** el admin expande su detalle en el historial, **Then** se muestra la lista de preguntas usadas con: posición en el PDF, topic, subtopic, y un indicador si la pregunta fue un reemplazo manual (revisión).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada material generado exitosamente MUST registrar en la tabla `material_question_usage` todas las `question_id` utilizadas, vinculadas al `material_request_id` y con timestamp de uso.
- **FR-002**: Al armar el payload de generación de un nuevo material, el backend MUST consultar la tabla `material_question_usage` para obtener las `question_id` usadas recientemente para el mismo curso, e incluirlas como lista de exclusión en el payload de SQS.
- **FR-003**: La ventana de exclusión MUST estar acotada al Ciclo Académico actual. El sistema MUST excluir todas las preguntas usadas previamente para el mismo curso dentro del mismo ciclo, sin importar el tipo de material generado (ej. un balotario excluye para el examen). Al iniciar un nuevo ciclo, el historial de exclusión para ese nuevo ciclo inicia vacío.
- **FR-004**: La regla de anti-repetición MUST ser estricta. Si el pool de preguntas disponibles para un subtopic se agota debido a las exclusiones del ciclo actual, el sistema NUNCA repetirá preguntas automáticamente. El Core API retornará menos preguntas (o cero) y el flujo de generación lo manejará como vacíos/inconsistencias según lo definido en la Spec 004 (estado `COMPLETED_WITH_WARNINGS` o resolución manual en `REVIEW_REQUIRED`).
- **FR-005**: La vista de historial MUST permitir filtrar por: tipo de material, curso, rango de fechas y estado.
- **FR-006**: Los links de descarga expirados MUST poder regenerarse bajo demanda (nueva URL pre-firmada de S3).

### Structural Constraints (Critical)

- **CR-001**: La consulta de anti-repetición MUST ser eficiente. Se requiere un índice compuesto en `material_question_usage(course_id, question_id, used_at)` para que la exclusión no degrade el rendimiento.
- **CR-002**: Los Casos de Uso en NestJS interactúan exclusivamente con interfaces abstractas de repositorios, nunca con el ORM directamente.

### Key Entities

- **material_question_usage**: Tracking de preguntas usadas. Campos: `id` (uuid), `material_request_id` (FK → material_requests), `question_id` (string — referencia al Core API), `course_id` (FK → course), `topic_id` (FK → topic), `subtopic_id` (FK → subtopic), `position_in_pdf` (number), `was_replacement` (boolean — true si fue reemplazo manual en revisión), `used_at` (timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El historial muestra todos los materiales generados con datos completos y filtros funcionales.
- **SC-002**: Las preguntas usadas en cualquier material anterior del mismo curso dentro del mismo ciclo académico son efectivamente excluidas de nuevas generaciones, verificable via test E2E.
- **SC-003**: Cuando el pool se agota para un subtopic, el sistema mantiene la exclusión estricta (no repite preguntas) y traslada el faltante a la vista de revisión como vacíos.
- **SC-004**: Los links de descarga expirados pueden regenerarse sin error.

## Edge Cases

- **EC-001**: Si un material fue generado con revisión manual y algunas preguntas fueron reemplazadas, tanto las preguntas originales descartadas como las reemplazos finales MUST registrarse en el tracking (las descartadas no cuentan como "usadas", solo las finales).
- **EC-002**: Si el admin re-genera un material para la misma semana/curso (ej. quiere una versión diferente), las preguntas del material anterior SÍ están en la lista de exclusión — forzando variedad.
- **EC-003**: Si no hay historial previo (primer material de un curso), la lista de exclusión está vacía y la generación procede sin restricciones.

## Assumptions

- Se asume que el Core API soporta un parámetro de exclusión (ej. `exclude_question_ids`) para filtrar preguntas ya usadas.
- Se asume que la tabla `material_question_usage` puede crecer significativamente, por lo que los índices son críticos para el rendimiento.
- Se asume que esta spec complementa la Spec 004 (Generación y Revisión) — ambas comparten la entidad `material_requests`.
- Se asume que el modelo de autorización (qué roles pueden acceder al historial y consultar preguntas usadas) se definirá en una spec de permisos/roles separada.

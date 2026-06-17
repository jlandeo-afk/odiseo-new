# Feature Specification: Catálogos Simplificados y Gestión del Tiempo Académico

**Feature Branch**: `002-catalogos-tiempo-b2b`

**Created**: 2026-06-15

**Status**: Draft

## Clarifications

### Session 2026-06-16

- Q: ¿Los Subtopics también tienen `local_alias` editable? → A: NO. Los subtopics vienen del banco base y son de solo lectura. Solo los Topics tienen alias editable.
- Q: ¿Cómo se manejan los errores de SQS en el Consumer? → A: DLQ (Dead Letter Queue). Después de N reintentos, el mensaje va a una cola de errores.
- Q: ¿Un Ciclo puede estar activo sin semanas? → A: No. Al crear un ciclo, el admin define la cantidad de semanas y se generan automáticamente, todas activas por defecto. Pueden desactivarse después.
- Q: ¿Los ciclos tienen fecha de inicio y fin? → A: Sí. El admin coloca fecha de inicio y cantidad de días por semana. La fecha fin se calcula automáticamente: `end_date = start_date + (total_weeks × days_per_week)`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de Alias y Visibilidad de Taxonomía (Priority: P1)

Como administrador del tenant, quiero poder ocultar temas (`is_active = false`) y asignar nombres personalizados (`local_alias`) a los `topics`, sin afectar el `core_name` original, para adaptar el banco global a la currícula de mi colegio.

**Independent Test**: Acceso a la vista de catálogos. Edición inline del alias de un topic. Verificación de que el `core_name` permanece intacto en la BD. Toggle de visibilidad de un topic y verificación de que desaparece de la vista de UI (pero permanece en la vista de administración).

**Acceptance Scenarios**:

1. **Given** un topic con `core_name = "Ecuaciones Diferenciales"`, **When** el admin asigna `local_alias = "ED"`, **Then** la UI muestra "ED" en todas las vistas del tenant, pero el `core_name` original permanece intacto para sincronización con el Core.
2. **Given** un topic con `is_active = true`, **When** el admin lo desactiva, **Then** el topic deja de aparecer en la jerarquía visible para la UI operativa, pero sigue visible en la vista de administración de catálogos con indicador visual de inactivo.
3. **Given** un subtopic cualquiera, **When** el admin accede a la vista de catálogos, **Then** el subtopic se muestra como solo lectura (nombre del Core, sin opción de edición de alias), ya que los subtopics son datos del banco base y no se personalizan a nivel de tenant.

---

### User Story 2 - Sincronización Asíncrona Global (Priority: P1)

Como sistema, necesito un Consumer de SQS en NestJS que procese actualizaciones del Banco Global, insertando nuevos registros o actualizando exclusivamente la columna `core_name` en el esquema del tenant sin sobrescribir los alias locales.

**Independent Test**: Envío de un payload simulado al Consumer SQS con un `topic` existente cuyo `core_name` cambió. Verificación de que `core_name` se actualizó pero `local_alias` permaneció intacto. Envío de un `topic` nuevo y verificación de que se insertó con `local_alias = null` e `is_active = true`.

**Acceptance Scenarios**:

1. **Given** un topic existente con `local_alias = "Álgebra Básica"`, **When** el Consumer recibe un evento `TopicUpdated` del Core API, **Then** actualiza el `core_name` del topic (INSERT ON CONFLICT DO UPDATE SET core_name = EXCLUDED.core_name) sin modificar `local_alias` ni `is_active`.
2. **Given** un nuevo topic que no existe en el esquema del tenant, **When** el Consumer recibe un evento `TopicCreated`, **Then** inserta el registro con `local_alias = null` e `is_active = true` por defecto.
3. **Given** que un mensaje de SQS falla después de N reintentos, **When** el Consumer no puede procesar el mensaje, **Then** el mensaje se envía automáticamente a la Dead Letter Queue (DLQ) para auditoría y reprocesamiento manual.

---

### User Story 3 - Tableros de Tiempo Académico (Priority: P1)

Como coordinador académico, quiero crear y gestionar Ciclos académicos definiendo su nombre, fecha de inicio, cantidad de semanas y días por semana. Al crear un ciclo, las semanas se generan automáticamente y puedo desactivar semanas específicas (feriados) sin eliminarlas, para mantener intacta la cuadrícula de planificación.

**Independent Test**: Creación de un ciclo con fecha de inicio 2026-03-01, 16 semanas, 5 días/semana. Verificación de que se generaron 16 registros de `cycle_weeks` con fechas calculadas. Verificación de que `end_date` = 2026-06-20 (16×5 = 80 días hábiles). Desactivación de la semana 8 (feriado) y verificación de que el registro permanece con `is_active = false`.

**Acceptance Scenarios**:

1. **Given** un coordinador en la vista de Tiempo Académico, **When** crea un nuevo ciclo proporcionando `name`, `start_date`, `total_weeks` y `days_per_week`, **Then** el sistema calcula automáticamente `end_date` y genera N registros de `cycle_weeks` con `week_number` secuencial (1..N), fechas calculadas y `is_active = true` por defecto.
2. **Given** un ciclo con semanas activas, **When** el admin desactiva una semana (ej. semana de feriado), **Then** el registro persiste con `is_active = false` (soft-delete semántico), manteniendo la integridad posicional para sílabos vinculados.
3. **Given** un ciclo existente, **When** el admin intenta eliminar una semana del ciclo, **Then** el backend rechaza la operación con un error descriptivo. La eliminación física de semanas está prohibida.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La base de datos del tenant contendrá solo las tablas de catálogo: `courses`, `topics`, `subtopics`. No deben existir tablas locales para Universidades, Áreas o Modalidades; estas son de uso exclusivo del Banco Global en fase de generación.
- **FR-002**: Los `topics` expondrán columnas de solo lectura `core_name` y columnas modificables `local_alias` (nullable) e `is_active` (boolean, default true). Los `subtopics` son de solo lectura — no poseen `local_alias` editable; sus nombres provienen exclusivamente del banco base (Core API).
- **FR-003**: El Frontend NO debe exponer operaciones de creación (POST) ni eliminación física o lógica completa (DELETE) para la taxonomía base. Solo se permite actualización de alias y visibilidad (PATCH) exclusivamente para `topics`.
- **FR-004**: El servicio de NestJS debe consumir colas de Amazon SQS para insertar nuevos nodos en la taxonomía o actualizar el `core_name` de los existentes, empleando Raw SQL (`INSERT ... ON CONFLICT DO UPDATE SET core_name = EXCLUDED.core_name`) para preservar los alias locales.
- **FR-005**: La cola SQS MUST tener configurada una Dead Letter Queue (DLQ) para mensajes que fallen después de N reintentos, garantizando que ningún evento de sincronización se pierda silenciosamente.
- **FR-006**: La eliminación de `cycle_weeks` en el Backend está prohibida (restricción a nivel de código); debe aplicarse una actualización de estado (`is_active = false`).
- **FR-007**: Al crear un ciclo académico, el admin MUST proveer `name`, `start_date`, `total_weeks` y `days_per_week`. El sistema MUST calcular automáticamente `end_date` y generar `total_weeks` registros de `cycle_weeks` con fechas calculadas secuencialmente, todos con `is_active = true` por defecto.

### Structural Constraints (Critical)

- **CR-001**: Los Casos de Uso (Use Cases) en NestJS tienen estrictamente prohibido interactuar con el ORM directamente. Solo pueden interactuar con las interfaces abstractas de los repositorios.
- **CR-002**: Se debe emplear una Estrategia de Persistencia Híbrida: Raw SQL para la actualización masiva/batch del Consumer SQS y TypeORM para el CRUD estándar y resolución de `search_path`.
- **CR-003**: Frontend UX (Velocidad Absoluta): Obligatorio implementar Optimistic UI para todas las mutaciones, un Command Palette (Cmd+K) global, y usar Slide-overs en lugar de Modales bloqueantes.
- **CR-004**: Frontend UI (Diseño B2B Moderno): Estilo tipo Linear/Stripe. Uso de tipografía geométrica (Inter/Geist), diseño hiper-compacto (Data-Density) para matrices, y micro-interacciones sin saltos en el DOM.

### Key Entities

- **courses**: Catálogo de cursos. Campos: `id` (uuid), `core_name` (string, readonly), `is_active` (boolean).
- **topics**: Temas del curso. Campos: `id` (uuid), `course_id` (FK), `core_name` (string, readonly), `local_alias` (string, nullable, editable), `is_active` (boolean, editable).
- **subtopics**: Subtemas del topic. Campos: `id` (uuid), `topic_id` (FK), `core_name` (string, readonly), `is_active` (boolean). **NO tiene `local_alias`** — es de solo lectura.
- **cycle**: Ciclo académico. Campos: `id` (uuid), `name` (string), `year` (number), `start_date` (date), `end_date` (date, auto-calculada), `days_per_week` (number), `total_weeks` (number), `is_active` (boolean).
- **cycle_weeks**: Semanas del ciclo. Campos: `id` (uuid), `cycle_id` (FK), `week_number` (number, secuencial), `start_date` (date, calculada), `end_date` (date, calculada), `is_active` (boolean, default true, soft-delete).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los catálogos se personalizan visualmente en la UI, mostrando `local_alias` si existe o cayendo a `core_name` si no. Los subtopics siempre muestran `core_name` sin opción de edición.
- **SC-002**: El Worker SQS puede actualizar el `core_name` de un `topic` sin sobrescribir su `local_alias`.
- **SC-003**: La desactivación de una semana en la UI no borra el registro de BD, manteniendo la integridad posicional de los sílabos.
- **SC-004**: Los mensajes fallidos del Consumer SQS son capturados por la DLQ y pueden ser auditados o reprocesados.
- **SC-005**: Al crear un ciclo con `total_weeks = 16`, exactamente 16 registros de `cycle_weeks` se generan con fechas calculadas correctamente.

## Edge Cases

- **EC-001**: Si un `topic` tiene `is_active = false` pero tiene subtopics activos, los subtopics no se muestran en la vista operativa (heredan la inactividad del padre).
- **EC-002**: Si un evento SQS intenta actualizar un `subtopic` cuyo `topic_id` no existe en el esquema del tenant, el Consumer MUST insertar primero el topic padre (si viene en el mismo batch) o registrar el error en la DLQ.
- **EC-003**: Al crear un ciclo con `days_per_week = 7`, las semanas son de 7 días (incluyendo fines de semana). Esto es válido para instituciones con calendario continuo.

## Assumptions

- Se asume que el Core API emite eventos de sincronización por Amazon SQS cuando se crean o actualizan topics en el banco global.
- Se asume que la taxonomía del tenant no es creada manualmente — toda la data proviene del Core API vía SQS.
- Se asume que un tenant puede tener múltiples ciclos, pero solo uno activo a la vez.

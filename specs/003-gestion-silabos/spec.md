# Feature Specification: Gestión de Sílabos

**Feature Branch**: `003-gestion-silabos`

**Created**: 2026-06-16

**Status**: Draft

## Context

El sílabo es el puente entre los Catálogos (taxonomía de cursos/temas/subtemas) y la Generación de Materiales PDF. Define qué temas y subtemas se evalúan en cada semana del ciclo académico, y cuántas preguntas de cada tipo se requieren. Sin un sílabo configurado, el sistema no puede generar materiales porque no tiene una distribución de contenido.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Creación y Configuración de Sílabo (Priority: P1)

Como coordinador académico, quiero crear un sílabo para un curso específico vinculado a un ciclo académico activo, para definir la planificación de contenidos por semana que servirá como insumo para la generación de materiales.

**Independent Test**: Creación de un sílabo para el curso "Álgebra" vinculado al ciclo "2026-I". Verificación de que el sílabo se persiste con los campos correctos y queda asociado al ciclo y curso.

**Acceptance Scenarios**:

1. **Given** un ciclo académico activo y un curso visible en el catálogo del tenant, **When** el coordinador crea un nuevo sílabo seleccionando el curso y el ciclo, **Then** el sistema crea el registro de sílabo vinculado a ambos y habilita la vista de distribución por semanas.
2. **Given** un ciclo con semanas desactivadas, **When** el coordinador crea un sílabo para ese ciclo, **Then** las semanas desactivadas aparecen en la distribución pero marcadas como no disponibles (no se les puede asignar contenido).

---

### User Story 2 - Distribución de Contenido por Semana (Priority: P1)

Como coordinador académico, quiero asignar a cada semana del sílabo los temas y subtemas que se evaluarán, junto con la cantidad de preguntas requeridas por cada subtema, para estructurar el contenido que alimentará la generación de materiales.

**Independent Test**: Asignación del topic "Ecuaciones Lineales" con subtopic "Resolución Básica" y cantidad 5 a la semana 3 del sílabo. Verificación de que el registro de distribución se persiste correctamente. Edición de la cantidad a 3 y verificación de la actualización.

**Acceptance Scenarios**:

1. **Given** un sílabo creado y vinculado a un ciclo, **When** el coordinador asigna un topic + subtopic + cantidad a una semana activa, **Then** se crea un registro de `syllabus_distribution` con los IDs correspondientes y la cantidad solicitada.
2. **Given** una distribución existente en una semana, **When** el coordinador modifica la cantidad de preguntas, **Then** el registro se actualiza con Optimistic UI (respuesta inmediata en la UI, sincronización en background).
3. **Given** una semana con distribuciones asignadas, **When** el coordinador elimina una distribución, **Then** el registro se elimina y la UI refleja el cambio inmediatamente.

---

### User Story 3 - Visualización Resumen del Sílabo (Priority: P2)

Como coordinador académico, quiero ver un resumen consolidado del sílabo completo que muestre el total de preguntas por semana y por tema, para verificar que la distribución cubre adecuadamente el ciclo antes de generar materiales.

**Independent Test**: Acceso a la vista resumen de un sílabo con distribuciones en múltiples semanas. Verificación de que los totales por semana y por tema se calculan correctamente. Verificación de que semanas sin distribución se muestran vacías (no se ocultan).

**Acceptance Scenarios**:

1. **Given** un sílabo con distribuciones configuradas, **When** el coordinador accede a la vista resumen, **Then** se muestra una matriz de semanas × temas con las cantidades asignadas y totales por fila/columna.
2. **Given** semanas del ciclo sin distribución asignada, **When** el coordinador ve el resumen, **Then** las semanas vacías aparecen con indicador visual de "sin contenido" para que el coordinador identifique gaps en la planificación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear sílabos vinculados a exactamente un `course` y un `cycle` activos dentro del esquema del tenant.
- **FR-002**: Cada registro de distribución (`syllabus_distribution`) MUST contener: `syllabus_id`, `week_number`, `topic_id`, `subtopic_id` y `requested_quantity` (entero positivo).
- **FR-003**: No se permite asignar distribuciones a semanas desactivadas (`cycle_weeks.is_active = false`). El frontend MUST deshabilitar la interacción con semanas inactivas.
- **FR-004**: El frontend MUST implementar Optimistic UI para todas las mutaciones de distribución (crear, editar, eliminar) con rollback visual en caso de error del backend.
- **FR-005**: Solo los topics activos (`is_active = true`) del catálogo MUST ser seleccionables para la distribución del sílabo.
- **FR-006**: Un sílabo MUST poder marcarse como `is_active = false` para archivarlo, pero no eliminarse físicamente.

### Structural Constraints (Critical)

- **CR-001**: Los Casos de Uso (Use Cases) en NestJS tienen prohibido interactuar con el ORM directamente. Solo interactúan con las interfaces abstractas de los repositorios.
- **CR-002**: La vista de distribución del sílabo MUST emplear un diseño hiper-compacto (Data-Density) tipo matriz, consistente con el Design System de Linear/Stripe establecido en las specs anteriores.

### Key Entities

- **syllabus**: Sílabo. Campos: `id` (uuid), `cycle_id` (FK → cycle), `course_id` (FK → course), `name` (string), `is_active` (boolean, default true).
- **syllabus_distribution**: Distribución por semana. Campos: `id` (uuid), `syllabus_id` (FK → syllabus), `week_number` (number), `topic_id` (FK → topic), `subtopic_id` (FK → subtopic), `requested_quantity` (integer, > 0).

### Constraints de Integridad

- **UNIQUE**: (`syllabus_id`, `week_number`, `topic_id`, `subtopic_id`) — no se puede duplicar la misma combinación tema/subtema en una misma semana.
- **CHECK**: `requested_quantity > 0` — la cantidad siempre es positiva.
- **FK CASCADE**: Si un sílabo se desactiva, sus distribuciones permanecen (no se eliminan en cascada).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un sílabo puede ser creado, editado y visualizado en resumen sin errores.
- **SC-002**: La distribución de un sílabo completo (16 semanas, múltiples topics/subtopics) se puede configurar en la UI con Optimistic UI (respuesta visual < 100ms).
- **SC-003**: El payload de distribución del sílabo puede ser consumido por el módulo de Generación de Materiales como su input principal.

## Edge Cases

- **EC-001**: Si un topic se desactiva en el catálogo después de haber sido asignado a distribuciones del sílabo, las distribuciones existentes permanecen (no se eliminan automáticamente) pero se marcan con un indicador visual de "topic inactivo" en la UI.
- **EC-002**: Si un ciclo se desactiva, los sílabos vinculados a ese ciclo MUST quedar automáticamente como inactivos también.
- **EC-003**: Si el coordinador intenta crear un segundo sílabo para el mismo curso y ciclo, el sistema MUST advertir sobre el sílabo existente y ofrecer editarlo en lugar de crear uno duplicado.

## Assumptions

- Se asume que un tenant puede tener múltiples sílabos (uno por curso por ciclo).
- Se asume que la distribución del sílabo es el insumo principal que el módulo de Generación de Materiales consumirá para determinar qué preguntas solicitar al Core API.
- Se asume que los subtopics son de solo lectura (provienen del Core) y su visibilidad depende del topic padre activo.

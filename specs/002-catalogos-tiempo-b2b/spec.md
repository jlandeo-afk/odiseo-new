# Feature Specification: Catálogos Simplificados y Gestión del Tiempo Académico

**Feature Branch**: `002-catalogos-tiempo-b2b`

**Created**: 2026-06-15

**Status**: Draft

## Clarifications

### Session 2026-06-17

- Q: ¿Cómo se deben calcular las fechas de las semanas? → A: Las semanas siguen una cadencia de 7 días. La semana N empieza en `startDate + (N-1)*7` y termina en `inicio + (daysPerWeek - 1)`. La fecha fin del ciclo coincide con el fin de la última semana.
- Q: ¿Se mantiene la funcionalidad de alias local para los temas? → A: NO. Se descarta por completo `local_alias`. Los nombres de `topics` y `subtopics` provienen exclusivamente del banco y son idénticos para todos.
- Q: ¿Cómo se propaga el catálogo global hacia el SaaS B2B? → A: Estrategia Simplificada. Se descarta SQS para catálogos. Un Cron Job en NestJS descargará el catálogo del Core API y lo alojará centralizado en el esquema `public`. Las preferencias de ocultar temas (`is_active = false`) se guardarán en una pequeña tabla dentro del esquema de cada tenant.
- Q: ¿Se permite solapamiento de fechas entre múltiples ciclos activos? → A: Sí. Pueden existir múltiples ciclos activos en paralelo sin validaciones restrictivas de choque de fechas.
- Q: ¿Se permite eliminar un Ciclo completo? → A: Sí, pero mediante un Soft Delete y únicamente si el ciclo NO tiene registros relacionados (ej. sílabos). Además, se mantiene la opción independiente de "Desactivar" (`is_active = false`) en cualquier momento.

### Session 2026-06-16

- Q: ¿Un Ciclo puede estar activo sin semanas? → A: No. Al crear un ciclo, el admin define la cantidad de semanas y se generan automáticamente, todas activas por defecto. Pueden desactivarse después.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visibilidad de Taxonomía (Priority: P1)

Como administrador del tenant, quiero poder ocultar temas (`is_active = false`) para adaptar el catálogo a la currícula de mi colegio activando o desactivando los temas pertinentes.

**Independent Test**: Acceso a la vista de catálogos. Toggle de visibilidad de un topic y verificación de que desaparece de la vista de UI (pero permanece en la vista de administración). Verificación de que los nombres son de solo lectura.

**Acceptance Scenarios**:

1. **Given** la lista de catálogos, **When** el admin revisa los temas, **Then** todos los `topics` y `subtopics` se muestran con su nombre original del banco (solo lectura) sin opción de edición.
2. **Given** un topic con `is_active = true`, **When** el admin lo desactiva, **Then** el topic deja de aparecer en la jerarquía visible para la UI operativa (guardando el estado en el esquema del tenant), pero sigue visible en la vista de administración.
3. **Given** una actualización de nombre en el banco global, **When** el Cron Job del sistema sincroniza, **Then** el nuevo nombre se refleja automáticamente en la UI de todos los clientes sin iterar.

---

### User Story 2 - Sincronización Programada (Cron Job) (Priority: P1)

Como sistema, necesito un proceso programado (Cron) en NestJS que consulte el Banco Global mediante API REST (Polling) y mantenga la taxonomía base centralizada en el esquema `public` del SaaS B2B, garantizando simplicidad, resiliencia y bajo acoplamiento.

**Independent Test**: Ejecución manual del Cron Job. Verificación de que se insertan o actualizan los `courses`, `topics` y `subtopics` en el esquema `public` sin alterar las preferencias de visibilidad de los tenants.

**Acceptance Scenarios**:

1. **Given** el esquema `public`, **When** el Cron detecta una actualización del Banco, **Then** actualiza el nombre del topic (UPSERT) en el esquema `public` una sola vez.
2. **Given** que el Cron falla por caída del Banco, **When** ocurre el error, **Then** la operación falla silenciosamente y se reintenta en la siguiente ejecución programada sin detener el SaaS B2B.

---

### User Story 3 - Tableros de Tiempo Académico (Priority: P1)

Como coordinador académico, quiero crear y gestionar Ciclos académicos definiendo su nombre, fecha de inicio, cantidad de semanas y días por semana. Al crear un ciclo, las semanas se generan automáticamente y puedo desactivar semanas específicas (feriados) sin eliminarlas, para mantener intacta la cuadrícula de planificación.

**Independent Test**: Creación de un ciclo con fecha de inicio 2026-03-01, 16 semanas, 5 días/semana. Verificación de que se generaron 16 registros de `cycle_weeks` con fechas calculadas. Verificación de que `end_date` del ciclo es calculado según la última semana. Desactivación de la semana 8 (feriado) y verificación de que el registro permanece con `is_active = false`.

**Acceptance Scenarios**:

1. **Given** un coordinador en la vista de Tiempo Académico, **When** crea un nuevo ciclo proporcionando `name`, `start_date`, `total_weeks` y `days_per_week`, **Then** el sistema calcula automáticamente las fechas de cada semana (Semana N inicio = `start_date` + (N-1)*7, fin = inicio + `days_per_week` - 1) y genera N registros de `cycle_weeks` con `is_active = true` por defecto. El `end_date` del ciclo es el `end_date` de la última semana.
2. **Given** un ciclo con semanas activas, **When** el admin desactiva una semana (ej. semana de feriado), **Then** el registro persiste con `is_active = false` (soft-delete semántico), manteniendo la integridad posicional para sílabos vinculados.
3. **Given** un ciclo existente, **When** el admin intenta eliminar una semana del ciclo, **Then** el backend rechaza la operación con un error descriptivo. La eliminación física de semanas está prohibida.
4. **Given** un ciclo sin sílabos asociados, **When** el admin intenta eliminar el ciclo, **Then** la operación es exitosa aplicando un Soft Delete.
5. **Given** un ciclo con sílabos asociados, **When** el admin intenta eliminar el ciclo, **Then** la operación es rechazada; el admin solo puede desactivarlo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La base de datos del SaaS B2B contendrá las tablas de catálogo (`courses`, `topics`, `subtopics`) alojadas exclusivamente en el esquema compartido `public`.
- **FR-002**: Las entidades de catálogo son de solo lectura global. El esquema de cada tenant solo guardará una tabla de preferencias (`tenant_topic_visibility`) para definir si un topic fue ocultado localmente (`is_active = false`).
- **FR-003**: El Frontend NO debe exponer operaciones de creación, edición de nombres, ni eliminación de taxonomía base. Solo se permite el toggle de visibilidad para `topics`.
- **FR-004**: NestJS implementará un Cron Job (`@nestjs/schedule`) para sincronizar el esquema `public` contra el Core API usando peticiones REST, eliminando la dependencia a colas SQS para este módulo.
- **FR-005**: La eliminación física de `cycle_weeks` y `cycles` está prohibida. Los ciclos soportan eliminación vía soft-delete SOLAMENTE si no tienen entidades relacionadas (como sílabos). Si tienen relaciones, solo se permite desactivarlos (`is_active = false`).
- **FR-006**: Al crear un ciclo académico, el admin MUST proveer `name`, `start_date`, `total_weeks` y `days_per_week`. El sistema MUST calcular automáticamente `end_date` y autogenerar las `cycle_weeks`.

### Structural Constraints (Critical)

- **CR-001**: Los Casos de Uso (Use Cases) en NestJS tienen estrictamente prohibido interactuar con el ORM directamente. Solo pueden interactuar con las interfaces abstractas de los repositorios.
- **CR-002**: Frontend UX (Velocidad Absoluta): Obligatorio implementar Optimistic UI para todas las mutaciones, un Command Palette (Cmd+K) global, y usar Slide-overs en lugar de Modales bloqueantes.
- **CR-003**: Frontend UI (Diseño B2B Moderno): Estilo tipo Linear/Stripe. Uso de tipografía geométrica (Inter/Geist), diseño hiper-compacto (Data-Density) para matrices, y micro-interacciones sin saltos en el DOM.

### Key Entities

**Esquema Público (`public`):**
- **courses**: `id` (uuid), `name` (string).
- **topics**: `id` (uuid), `course_id` (FK), `name` (string).
- **subtopics**: `id` (uuid), `topic_id` (FK), `name` (string).

**Esquema del Cliente (`tenant_xxx`):**
- **tenant_topic_visibility**: Preferencias locales. Campos: `topic_id` (uuid), `is_active` (boolean).
- **cycle**: Ciclo académico. Campos: `id` (uuid), `name` (string), `year` (number), `start_date` (date), `end_date` (date, auto-calculada), `days_per_week` (number), `total_weeks` (number), `is_active` (boolean).
- **cycle_weeks**: Semanas del ciclo. Campos: `id` (uuid), `cycle_id` (FK), `week_number` (number), `start_date` (date), `end_date` (date), `is_active` (boolean).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los catálogos leen instantáneamente del esquema `public`, garantizando que todos los colegios vean los nombres oficiales sin desajustes.
- **SC-002**: El Cron Job puede sincronizar el catálogo entero desde el Core API al esquema `public` sin requerir SQS ni configuración de red intra-VPC.
- **SC-003**: Al crear un ciclo con `total_weeks = 16`, exactamente 16 registros de `cycle_weeks` se generan automáticamente.

## Edge Cases

- **EC-001**: Si un `topic` es marcado como oculto en `tenant_topic_visibility`, sus `subtopics` asociados no deben mostrarse en la UI (herencia de inactividad).
- **EC-002**: Si el Cron Job intenta ejecutarse pero el Core API devuelve error, la ejecución se cancela silenciosamente manteniendo la data `public` intacta.
- **EC-003**: Solapamiento de Ciclos: El backend permite que dos o más ciclos tengan fechas que se crucen en el calendario. No se arrojará error de validación de fechas contra otros ciclos existentes.

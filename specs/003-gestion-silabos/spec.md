# Feature Specification: Gestión de Sílabos

**Feature Branch**: `003-gestion-silabos`

**Created**: 2026-06-16

**Status**: Draft

## Context

El sílabo es el puente entre los Catálogos (taxonomía de cursos/temas/subtemas) y la Generación de Materiales PDF. Define qué temas y subtemas se evalúan en cada semana del ciclo académico, estableciendo un peso base (`requested_quantity`). La configuración específica de los tipos de materiales (Examen, Práctica, etc.) y las reglas exactas de extracción de preguntas se centralizan a nivel del Ciclo a través de **Perfiles de Material**. Esto simplifica el sílabo y evita retrabajos al generar. Sin un sílabo, el sistema no tiene distribución de contenido.

## Clarifications

### Session 2026-06-17
- Q: ¿La selección de un subtema (`subtopic_id`) en la distribución del sílabo es estrictamente obligatoria? → A: Obligatorio: Cada distribución debe especificar obligatoriamente un subtema (`subtopic_id` NOT NULL).
- Q: ¿Qué hacer al generar materiales con temas inactivos del catálogo? → A: Advertir pero permitir: El sistema advierte que hay temas inactivos, pero permite continuar con la generación.
- Q: ¿Autocompletar la cantidad de preguntas al asignar un subtema? → A: Autocompletar con 1: El sistema asigna `1` por defecto para hacer la carga fluida.
- Q: ¿Soportar clonación de sílabos entre ciclos? → A: Permitir clonación: El sistema debe incluir una función para clonar un sílabo (y toda su distribución) desde un ciclo anterior.
- Q: ¿Estrategia de resolución de conflictos concurrentes en Optimistic UI? → A: Last-write-wins: El último cambio que llega al servidor sobrescribe la celda de distribución.
- Q: ¿Existe un límite máximo de preguntas que se pueden asignar a una misma semana en el sílabo? → A: Sí, máximo 100 preguntas por semana en total para evitar sobrecargas.
- Q: Si una actualización en Optimistic UI falla tras cambiar de ruta, ¿cómo se notifica? → A: Notificación global (Toast) que persista entre rutas indicando el error específico.
- Q: ¿Se puede editar la distribución de una semana si ya se generaron materiales para ella? → A: Advertencia: Se permite la edición, pero se muestra un "Warning" indicando que el material generado quedará desactualizado.
- Q: ¿Qué sucede al clonar un sílabo si el destino ya tiene datos? → A: Sobrescribir con advertencia: El sistema permite la clonación, pero debe mostrar un diálogo de confirmación advirtiendo que los datos existentes serán sobrescritos.
- Q: ¿Qué sucede si un subtema asignado se elimina en el Core API? → A: No aplicable: Por regla de negocio, los temas, subtemas y cursos importados son inmutables/incrementales y nunca se eliminan.
- Q: ¿Dónde se configuran los tipos de material (Examen, Práctica) y cómo interactúan con el sílabo? → A: Perfiles de Material por Ciclo. Para simplificar el proceso sin perder estabilidad, el sílabo se limita a mapear temas a semanas con una cantidad base. Los tipos de materiales se configurarán a nivel de Ciclo (ej. "Práctica Semanal", "Examen Parcial") conteniendo las reglas para leer la matriz del sílabo al momento de generar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Creación y Configuración de Sílabo (Priority: P1)

Como coordinador académico, quiero crear un sílabo para un curso específico vinculado a un ciclo académico activo, para definir la planificación de contenidos por semana que servirá como insumo para la generación de materiales.

**Independent Test**: Creación de un sílabo para el curso "Álgebra" vinculado al ciclo "2026-I". Verificación de que el sílabo se persiste con los campos correctos y queda asociado al ciclo y curso.

**Acceptance Scenarios**:

1. **Given** un ciclo académico activo y un curso visible en el catálogo del tenant, **When** el coordinador crea un nuevo sílabo seleccionando el curso y el ciclo, **Then** el sistema crea el registro de sílabo vinculado a ambos y habilita la vista de distribución por semanas.
2. **Given** un ciclo con semanas desactivadas, **When** el coordinador crea un sílabo para ese ciclo, **Then** las semanas desactivadas aparecen en la distribución pero marcadas como no disponibles (no se les puede asignar contenido).

---

### User Story 2 - Distribución de Contenido por Semana (Priority: P1)

Como coordinador académico, quiero asignar a cada semana del sílabo los temas y subtemas que se evaluarán, junto con una cantidad base referencial de preguntas por cada subtema, para estructurar la matriz temática que alimentará los Perfiles de Material.

**Independent Test**: Asignación del topic "Ecuaciones Lineales" con subtopic "Resolución Básica" y cantidad 5 a la semana 3 del sílabo. Verificación de que el registro de distribución se persiste correctamente. Edición de la cantidad a 3 y verificación de la actualización.

**Acceptance Scenarios**:

1. **Given** un sílabo creado y vinculado a un ciclo, **When** el coordinador asigna un topic + subtopic a una semana activa, **Then** se crea un registro de `syllabus_distribution` con los IDs correspondientes asumiendo una `requested_quantity` por defecto de `1` (optimizando clics).
2. **Given** una distribución existente en una semana, **When** el coordinador modifica la cantidad de preguntas, **Then** el registro se actualiza con Optimistic UI (respuesta inmediata en la UI, sincronización en background).
3. **Given** una semana con distribuciones asignadas, **When** el coordinador elimina una distribución, **Then** el registro se elimina y la UI refleja el cambio inmediatamente.

---

### User Story 3 - Visualización Resumen del Sílabo (Priority: P2)

Como coordinador académico, quiero ver un resumen consolidado del sílabo completo que muestre el total de preguntas por semana y por tema, para verificar que la distribución cubre adecuadamente el ciclo antes de generar materiales.

**Independent Test**: Acceso a la vista resumen de un sílabo con distribuciones en múltiples semanas. Verificación de que los totales por semana y por tema se calculan correctamente. Verificación de que semanas sin distribución se muestran vacías (no se ocultan).

**Acceptance Scenarios**:

1. **Given** un sílabo con distribuciones configuradas, **When** el coordinador accede a la vista resumen, **Then** se muestra una matriz de semanas × temas con las cantidades asignadas y totales por fila/columna.
2. **Given** semanas del ciclo sin distribución asignada, **When** el coordinador ve el resumen, **Then** las semanas vacías aparecen con indicador visual de "sin contenido" para que el coordinador identifique gaps en la planificación.

---

### User Story 4 - Clonación de Sílabo (Priority: P2)

Como coordinador académico, quiero poder clonar un sílabo existente de un ciclo anterior hacia el ciclo actual, para evitar el trabajo manual repetitivo de reasignar toda la distribución semana a semana.

**Independent Test**: Clonación del sílabo de "Geometría" del ciclo "2025-II" al ciclo "2026-I". Verificación de que todas las distribuciones válidas se copian a las semanas correspondientes en el nuevo ciclo.

**Acceptance Scenarios**:

1. **Given** un ciclo activo sin sílabo para un curso, **When** el coordinador selecciona la opción "Copiar de ciclo anterior" y elige un sílabo origen, **Then** el sistema duplica el sílabo y todas sus distribuciones hacia el ciclo actual.
2. **Given** un ciclo destino que ya tiene distribuciones previas, **When** el coordinador intenta clonar, **Then** el sistema muestra un diálogo de advertencia ("Existen datos previos que serán sobrescritos") y, tras confirmar, reemplaza las distribuciones actuales por las del origen.
3. **Given** una clonación en curso, **When** el ciclo destino tiene menos semanas activas que el origen, **Then** el sistema clona las distribuciones solo hasta la última semana válida del ciclo destino e ignora el resto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear sílabos vinculados a exactamente un `course` y un `cycle` activos dentro del esquema del tenant.
- **FR-002**: Cada registro de distribución (`syllabus_distribution`) MUST contener: `syllabus_id`, `week_number`, `topic_id`, `subtopic_id` y `requested_quantity` (entero positivo).
- **FR-003**: No se permite asignar distribuciones a semanas desactivadas (`cycle_weeks.is_active = false`). El frontend MUST deshabilitar la interacción con semanas inactivas.
- **FR-004**: El frontend MUST implementar Optimistic UI para todas las mutaciones de distribución con rollback visual en caso de error del backend, e incluir una notificación global (Toast) persistente si el error ocurre cuando el usuario ya navegó a otra ruta.
- **FR-005**: Solo los topics activos (`is_active = true`) del catálogo MUST ser seleccionables para la distribución del sílabo.
- **FR-006**: Un sílabo MUST poder marcarse como `is_active = false` para archivarlo, pero no eliminarse físicamente.
- **FR-007**: El sistema MUST validar que la suma total de `requested_quantity` asignada a una misma semana no exceda el límite estricto de 100 preguntas.

### Structural Constraints (Critical)

- **CR-001**: Los Casos de Uso (Use Cases) en NestJS tienen prohibido interactuar con el ORM directamente. Solo interactúan con las interfaces abstractas de los repositorios.
- **CR-002**: La vista de distribución del sílabo MUST emplear un diseño hiper-compacto (Data-Density) tipo matriz, consistente con el Design System de Linear/Stripe establecido en las specs anteriores.

### Key Entities

- **syllabus**: Sílabo. Campos: `id` (uuid), `cycle_id` (FK → cycle), `course_id` (FK → course), `name` (string), `is_active` (boolean, default true).
- **syllabus_distribution**: Distribución por semana. Campos: `id` (uuid), `syllabus_id` (FK → syllabus), `week_number` (number), `topic_id` (FK → topic), `subtopic_id` (FK → subtopic, NOT NULL), `requested_quantity` (integer, > 0, actúa como peso base referencial).

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

- **EC-001**: Si un topic se desactiva en el catálogo después de haber sido asignado a distribuciones del sílabo, las distribuciones existentes permanecen pero se marcan con un indicador visual de "topic inactivo" en la UI. Al intentar generar materiales con este sílabo, el sistema MUST mostrar una advertencia, pero permitir que la generación continúe.
- **EC-002**: Si un ciclo se desactiva, los sílabos vinculados a ese ciclo MUST quedar automáticamente como inactivos también.
- **EC-003**: Si el coordinador intenta crear un segundo sílabo para el mismo curso y ciclo, el sistema MUST advertir sobre el sílabo existente y ofrecer editarlo en lugar de crear uno duplicado.
- **EC-004**: En caso de ediciones concurrentes de la misma celda de distribución por múltiples coordinadores, el sistema aplica resolución Last-Write-Wins (el último en guardar sobrescribe el valor), evitando bloqueos pesimistas.
- **EC-005**: Si el coordinador intenta editar la distribución de una semana para la cual ya se han generado materiales, el sistema MUST permitir la edición pero mostrar una advertencia visual ("Warning") indicando que los materiales existentes podrían quedar desactualizados.

## Assumptions

- Se asume que un tenant puede tener múltiples sílabos (uno por curso por ciclo).
- Se asume que la distribución del sílabo es la matriz temática base que, combinada con los Perfiles de Material configurados a nivel del Ciclo, servirá como insumo para que el módulo de Generación de Materiales solicite preguntas al Core API.
- Se asume que los subtopics son de solo lectura (provienen del Core) y su visibilidad depende del topic padre activo.
- Se asume que el catálogo importado del Core API (cursos, temas, subtemas) es inmutable/incremental. Los registros nunca se eliminan en el origen, garantizando la integridad referencial histórica de los sílabos.

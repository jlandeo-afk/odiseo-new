# Feature Specification: Generación de Balotario PDF

**Feature Branch**: `[001-generacion-balotario-pdf]`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Módulo de Generación de Balotario PDF en el SaaS B2B..."

## User Scenarios & Testing *(mandatory)*

### User Story 0 - Autenticación B2B y Aislamiento Multi-Tenant (Priority: P0)

Como administrador de colegio, quiero acceder a la plataforma mediante un subdominio personalizado (ej. `colegio.odiseo.com`), visualizar el branding de mi institución, y autenticarme de forma segura para garantizar que mi sesión esté estrictamente asilada y mis permisos determinen qué componentes visualizo.

**Why this priority**: La seguridad y la identidad corporativa son pilares del modelo SaaS B2B Enterprise. Es crítico prevenir fugas de información entre tenants.

**Independent Test**: Can be fully tested by attempting to log in via `colegio.odiseo.com`, verifying that the correct logo/colors are loaded, ensuring a user with a different `company_id` is rejected, and confirming that UI elements are rendered based on Spatie roles.

**Acceptance Scenarios**:

1. **Given** que un usuario ingresa a un subdominio específico, **When** carga la página de login, **Then** el sistema consulta `clientes_empresas.subdominio` y carga dinámicamente el branding correspondiente.
2. **Given** que el usuario ingresa sus credenciales, **When** el sistema autentica la petición, **Then** valida estrictamente que el `company_id` del usuario coincide con el de la empresa activa del subdominio.
3. **Given** que el usuario ha iniciado sesión con éxito, **When** carga el frontend, **Then** el estado de Nuxt se hidrata con los roles y permisos (ecosistema Spatie), mostrando/ocultando elementos (ej. botón "Generar Examen").

---

### User Story 1 - Generación Exitosa de Balotario (Priority: P1)

Como usuario administrador (colegio), quiero seleccionar los parámetros de mi curso (dificultad, temas, subtemas) y solicitar un balotario en PDF, para que el sistema lo genere en segundo plano y me notifique cuando esté listo para descargar, sin bloquear mi trabajo en la plataforma.

**Why this priority**: Este es el "Happy Path" fundamental del módulo. Sin esta funcionalidad, el colegio no puede obtener el material que constituye el valor principal del producto.

**Independent Test**: Can be fully tested by selecting a valid course and topics, observing the immediate UI release, waiting for the WebSocket notification, and successfully downloading the generated PDF.

**Acceptance Scenarios**:

1. **Given** que el administrador ha seleccionado un curso, nivel de dificultad, y una cantidad específica de temas/subtemas, **When** hace clic en solicitar material, **Then** la interfaz web se libera inmediatamente y muestra un mensaje de "Procesamiento en curso".
2. **Given** que la petición se está procesando en segundo plano, **When** el worker ensambla y sube el PDF con éxito al Object Storage, **Then** el sistema notifica al administrador en tiempo real mediante WebSockets.
3. **Given** que el administrador recibe la notificación de finalización, **When** visualiza el indicador en la UI, **Then** puede hacer clic en el enlace y descargar el balotario en PDF.

---

### User Story 2 - Reactivos Insuficientes o Vacíos (Priority: P2)

Como usuario administrador, quiero ser informado si no hay suficientes reactivos en el Banco de Preguntas global para los temas y dificultad que seleccioné, para poder ajustar mi solicitud o entender por qué no se generó el PDF.

**Why this priority**: Es el flujo alternativo más común. El Core API podría no tener contenido para combinaciones muy específicas de filtros.

**Independent Test**: Can be fully tested by requesting a topic/difficulty combination known to have zero questions in the Core API and verifying that a clear error notification is received instead of a broken PDF.

**Acceptance Scenarios**:

1. **Given** que el administrador solicitó un balotario con parámetros muy restrictivos, **When** el worker consulta al Core API y recibe una respuesta vacía o insuficiente, **Then** el proceso se detiene y se envía una notificación de error vía WebSockets.
2. **Given** que el sistema envió una notificación de error, **When** el administrador ve el indicador, **Then** la UI le informa que "No hay suficientes reactivos para los filtros seleccionados" y sugiere modificarlos.

---

### User Story 3 - Desconexión del WebSocket y Recuperación (Priority: P3)

Como usuario administrador, quiero poder descargar mi balotario generado incluso si cerré mi navegador o perdí conexión a internet durante la generación, para no tener que volver a solicitar el mismo material.

**Why this priority**: Es un caso límite realista. Los usuarios pueden cerrar la pestaña después de solicitar un procesamiento largo.

**Independent Test**: Can be fully tested by requesting a PDF, closing the browser immediately, waiting for the process to finish, logging back in, and finding the generated PDF available in a history or notification panel.

**Acceptance Scenarios**:

1. **Given** que el administrador solicitó un balotario y cerró sesión o perdió conexión, **When** el worker finaliza la generación del PDF con éxito, **Then** el estado de la solicitud se guarda en base de datos.
2. **Given** que un balotario fue generado mientras el administrador estaba offline, **When** el administrador vuelve a iniciar sesión y entra al panel, **Then** la UI consulta el estado histórico y le muestra el enlace de descarga del balotario previamente generado.

---

### User Story 4 - Curaduría Manual (UI Intermedia) (Priority: P1)

Como usuario administrador, tras la fase de "Generación Lógica" (selección de preguntas), quiero visualizar las preguntas elegidas en una UI intermedia antes de compilar el PDF. Esto me permitirá regenerar preguntas individuales, removerlas, realizar un completado manual o ejecutar un autocompletado general.

**Why this priority**: Asegura el control de calidad sobre el material generado antes de ser entregado o guardado en Object Storage.

**Independent Test**: Solicitar balotario y pausar en UI intermedia. Eliminar una pregunta y regenerar otra. Validar que la base de datos se actualice usando funciones estricatamente `void` y continuar a generación de PDF.

**Acceptance Scenarios**:

1. **Given** que las preguntas lógicas fueron obtenidas, **When** el sistema detecta que se requiere revisión, **Then** el proceso se pausa y la UI despliega la curaduría.
2. **Given** que la interfaz intermedia se está mostrando, **When** el administrador ejecuta la acción de remover o completar, **Then** el sistema invoca las funciones de PostgreSQL que actúan de manera atómica devolviendo estrictamente `void`.

---

### User Story 5 - Generación Automática (Cron/Scheduler) (Priority: P1)

Como administrador del sistema, quiero que el sistema dispare de forma automatizada la generación lógica y física de materiales basándose en las fechas de los ciclos (`cycle_weeks`), sin requerir mi intervención manual.

**Why this priority**: Es el motor de automatización principal para escalar el producto a múltiples colegios sin incremento lineal de operaciones.

**Independent Test**: Configurar fechas de inicio y fin para un `cycle_week`. Esperar a que el job programado procese y genere automáticamente el balotario, verificando que en base de datos las semanas sin contenido mantengan los registros `NULL` originales.

**Acceptance Scenarios**:

1. **Given** que el cron se ejecuta recurrentemente, **When** las fechas de inicio/fin de semana se cumplen, **Then** dispara un workflow equivalente al de la US1 para los ciclos configurados.
2. **Given** un ciclo donde hay semanas inactivas, **When** el job itera y guarda resultados, **Then** preserva intactos esos registros nulos sin eliminarlos de la BD.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-000**: UI/UX Moderna y Limpia. El frontend MUST utilizar Tailwind CSS junto con un Design System moderno orientado a SaaS (Shadcn-Vue o Nuxt UI). La arquitectura de Vue MUST ser "Clean Architecture", separando la UI (components) de la lógica de negocio consumida por Composables/Pinia. El diseño MUST incluir estados de carga (skeletons), manejo de errores amigable, y ser totalmente responsive (grado Enterprise).
- **FR-000b**: Multi-Tenant Login. El sistema MUST resolver el contexto del cliente en base al subdominio de acceso, consultando la tabla `clientes_empresas` (columna `subdominio`), personalizando la vista de login ANTES de autenticar.
- **FR-000c**: Aislamiento Estricto. La autenticación MUST validar de forma estricta que el `company_id` de la tabla `users` coincide con el esquema/tenant activo del subdominio.
- **FR-000d**: RBAC Hydration. La sesión devuelta MUST hidratar el estado del frontend con el ecosistema integrado de Spatie (`roles`, `permissions`, `users_roles`, `roles_permissions`) para gestionar dinámicamente la visibilidad de componentes UI.
- **FR-001**: System MUST allow the admin to select a course, difficulty level, and a specific set of topics and subtopics.
- **FR-002**: System MUST register the request and release the web interface immediately upon submission, offloading the work.
- **FR-003**: System MUST send the generation event to an asynchronous queue for processing.
- **FR-004**: System MUST NOT store heavy content (questions, media) directly in the B2B SaaS, but rather request it from the Core API.
- **FR-005**: Worker MUST request questions from the Core API by strictly filtering by the selected course, topics, subtopics, and difficulty.
- **FR-006**: Worker MUST assemble the final PDF document and upload it to Object Storage.
- **FR-007**: System MUST emit a real-time event via WebSockets to passively notify the connected admin when the PDF generation succeeds or fails.
- **FR-008**: System MUST display an indicator in the UI with the download link of the ready PDF.
- **FR-009**: System MUST derive the exact number of questions per topic/subtopic from the existing academic planning (syllabus). The backend MUST assemble the payload respecting the macro limits (defined by course, material type, and week) and the fine-grained distribution inherited from the syllabus details.
- **FR-010**: Worker MUST use a custom template per Tenant (school). The SQS event MUST contain the Tenant's metadata (e.g., commercial name, logo URL) so the worker can dynamically inject the personalized header into the generated PDF.
- **FR-011**: System MUST support an intermediate generation state (Logical Selection) that exposes the question set to a B2B UI before proceeding with the final PDF compilation.
- **FR-012**: System MUST provide REST endpoints to perform manual curation actions: `remove`, `regenerate`, `manual_complete`, and `auto_complete`.
- **FR-013**: System MUST execute an automated Cron Job / Scheduler mapping logic directly to the configured `cycle_weeks` start/end times.

### Structural Constraints (Critical)

- **CR-001**: System and API contracts MUST implement a strict physical domain separation between regular class materials/balotarios and exams.
- **CR-002**: Exams MUST mandatorily associate specific evaluation areas (e.g., Área A, Área B, Área C, Área A con medicina).
- **CR-003**: The worker MUST assemble completely segregated, independent booklets for each specific evaluation area when processing an exam.
- **CR-004**: System MUST rigorously preserve "inactive" weeks as valid `NULL` records in PostgreSQL tables; the cycle traversal algorithm is STRICTLY PROHIBITED from deleting or omitting them.
- **CR-005**: All PostgreSQL functions responsible for modifying curation states MUST have a return type of `void`.

### Key Entities

- **clientes_empresas**: Identifica al Tenant (colegio), su `subdominio` y metadatos de branding (logo, colores).
- **users**: Contiene la identidad del administrador y está estrictamente ligada a un `company_id`.
- **roles / permissions**: Entidades del ecosistema Spatie para la gestión de acceso basado en roles (RBAC).
- **MaterialRequest**: Represents the asynchronous job requested by the admin. Contains status (pending, processing, completed, failed), filters (course, difficulty, topics), and the final `file_url`.
- **QuestionReference**: Logical reference (`question_id`) pointing to the global Core API.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La interfaz web del SaaS B2B se libera en menos de 500ms tras hacer clic en solicitar el material.
- **SC-002**: El 100% de los ensamblajes de PDF se realizan en un hilo secundario/worker aislado, sin impactar el rendimiento del Core o el SaaS.
- **SC-003**: Los administradores reciben la notificación WebSocket en tiempo real con una latencia menor a 1 segundo desde que el PDF se sube al Object Storage.
- **SC-004**: No se registra ningún dato de reactivo pesado en la base de datos del B2B (Data leak avoidance garantizado).

## Assumptions

- Se asume que el Core API ya tiene un endpoint REST capaz de recibir filtros (course, topics, difficulty) y devolver una lista estructurada de reactivos (`question_id` + contenido textual/imágenes).
- Se asume que AWS API Gateway para WebSockets ya está configurado y el cliente frontend mantiene una conexión persistente estable durante su sesión.
- Se asume que existe un módulo o librería en el worker capaz de renderizar HTML a PDF o ensamblar PDFs nativos a partir de los datos json devueltos por el Core API.

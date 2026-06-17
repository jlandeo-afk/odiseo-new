# Feature Specification: Fundamentos y Autenticación B2B

**Feature Branch**: `001-fundamentos-b2b`

**Created**: 2026-06-15

**Status**: Draft

## Clarifications

### Session 2026-06-16

- Q: ¿Cómo se provisiona un nuevo tenant (schema)? → A: Automático — un endpoint `POST /api/v1/admin/companies` crea la empresa y provisiona el schema PostgreSQL automáticamente.
- Q: ¿Dónde se traduce subdomain → tenantSchema? → A: En el TenantMiddleware de NestJS. Consulta `companies` en esquema `public` y setea `tenantSchema` en CLS.
- Q: ¿Se usa JWT o sesiones? → A: JWT con cookie httpOnly. Access token en cookie httpOnly (seguro contra XSS), stateless.
- Q: ¿Catálogo de roles RBAC? → A: V1 solo con rol `admin` que tiene todos los permisos. Se expandirá en iteraciones futuras.
- Q: ¿La sesión persiste tras page refresh? → A: Sí, cookie httpOnly + endpoint `GET /auth/me` para rehidratar Pinia al cargar la app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aislamiento Físico y Multi-tenant (Priority: P1)

Como administrador del sistema SaaS, quiero que la base de datos divida la información de cada institución utilizando una estrategia estricta de Schema-per-tenant, para garantizar el aislamiento físico de los datos y evitar bajo cualquier concepto el riesgo de fuga de información entre colegios.

**Independent Test**: Creación de un nuevo tenant a través del proceso estándar y verificación manual en la base de datos de que un esquema aislado en PostgreSQL fue aprovisionado. Ejecución de un query desde el backend comprobando que el ORM/Query Builder respeta el path del esquema y no filtra información cruzada.

**Acceptance Scenarios**:

1. **Given** un entorno B2B multi-tenant, **When** se provisiona o accede a un nuevo cliente (colegio), **Then** el sistema configura o dirige las consultas hacia un esquema de PostgreSQL exclusivo para ese cliente (`tenant_<company_id>`).
2. **Given** que el backend recibe una petición HTTP o evento asíncrono de un usuario autenticado, **When** el sistema interactúa con la BD, **Then** el middleware de persistencia enruta las operaciones únicamente al esquema correspondiente a su institución, siendo imposible consultar datos de otros esquemas.

---

### User Story 2 - Login SaaS Robusto y Branding Dinámico (Priority: P1)

Como usuario administrador de un colegio, quiero acceder a mi panel B2B mediante un subdominio web personalizado (ej. `colegio.odiseo.com`), visualizar el logotipo y colores de mi institución antes de colocar mi clave, e iniciar sesión de forma segura.

**Independent Test**: Acceso a `http://colegio.localhost:3000/login`. Verificación visual de que el logo y el color primario corresponden al colegio. Intento de inicio de sesión de un administrador del `colegio` y comprobación de éxito. Intento de inicio de sesión de un administrador de `escuela` en `colegio.localhost` y comprobación de rechazo estricto (HTTP 401).

**Acceptance Scenarios**:

1. **Given** que un usuario ingresa la URL de un subdominio específico de cliente, **When** la aplicación Frontend (Nuxt) carga la vista de Login, **Then** invoca una consulta al esquema global y muestra dinámicamente el branding (nombre, logo, colores) de dicho subdominio consultando la tabla `companies`.
2. **Given** que el usuario introduce sus credenciales, **When** el backend autentica la petición, **Then** verifica incondicionalmente que el `company_id` del usuario (tabla `users`) coincida de forma exacta con la empresa dueña del subdominio activo.
3. **Given** un login exitoso, **When** el backend genera la respuesta, **Then** MUST emitir un JWT como cookie httpOnly (Secure, SameSite=Strict) con los claims del usuario (id, company_id, roles, permissions) y retornar el payload del usuario en el cuerpo de la respuesta.

---

### User Story 3 - Aislamiento Frontend y RBAC (Priority: P1)

Como usuario ya autenticado, quiero que la interfaz gráfica (UI) se adapte automáticamente a mis permisos (RBAC), mostrando u ocultando opciones de navegación para las cuales no tengo autorización, de manera que la experiencia sea segura y enfocada en mi rol.

**Independent Test**: Autenticación con un usuario que posee permisos restringidos (ej. solo `view_reports`). Verificación visual de que el menú de generación de materiales está oculto. Intento manual de navegar hacia la ruta protegida `/materials/review` y comprobación de que el Middleware global redirige o bloquea con error HTTP 403.

**Acceptance Scenarios**:

1. **Given** una sesión B2B válida tras un login exitoso, **When** Nuxt inicializa la aplicación, **Then** el store local de Pinia se hidrata con los roles y permisos del ecosistema Spatie (`roles`, `permissions`) devueltos por el backend.
2. **Given** una ruta protegida en el frontend, **When** el usuario intenta navegar hacia ella careciendo del permiso o rol explícito, **Then** el middleware global de Vue Router interrumpe la navegación arrojando un error 403 (Acceso Denegado).

---

### User Story 4 - Administración de Empresas (Priority: P1)

Como super-administrador de la plataforma Odiseo, quiero crear y gestionar empresas clientes (colegios) desde un panel centralizado, definiendo su subdominio, logo y colores, para que puedan acceder al sistema con su identidad visual propia.

**Independent Test**: Creación de una nueva empresa vía `POST /api/v1/admin/companies` con subdominio, nombre, logo_url y color. Verificación de que el schema PostgreSQL fue creado. Acceso al subdominio recién creado y verificación del branding.

**Acceptance Scenarios**:

1. **Given** un super-administrador autenticado en el panel central, **When** crea una nueva empresa proporcionando subdominio, nombre comercial, logo y color primario, **Then** el backend registra la empresa en la tabla `companies` del esquema `public` y ejecuta automáticamente `CREATE SCHEMA tenant_<company_id>` con las migraciones base del tenant.
2. **Given** una empresa recién creada, **When** un usuario navega al subdominio de esa empresa, **Then** el endpoint de branding retorna los datos configurados durante la creación.

---

### User Story 5 - Persistencia de Sesión (Priority: P1)

Como usuario autenticado, quiero que mi sesión se mantenga activa al recargar la página o abrir una nueva pestaña, sin tener que iniciar sesión nuevamente, siempre que mi token no haya expirado.

**Independent Test**: Login exitoso, recarga de página, verificación de que la UI muestra al usuario autenticado sin solicitar credenciales nuevamente. Verificación de que la cookie httpOnly se envía automáticamente en cada request.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión activa (cookie JWT válida), **When** recarga la página o abre una nueva pestaña, **Then** Nuxt ejecuta automáticamente `GET /api/v1/auth/me` en el middleware de inicialización, rehidrata Pinia con los datos del usuario, y la UI se renderiza como sesión activa.
2. **Given** un usuario cuyo token ha expirado, **When** recarga la página, **Then** el endpoint `/auth/me` retorna HTTP 401 y el middleware redirige a `/login`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El proyecto MUST establecer una base (Core Setup) en **NestJS** para el Backend y **Vue 3 / Nuxt 3** para el Frontend.
- **FR-002**: El Frontend MUST adoptar un Design System orientado a B2B SaaS, utilizando **Tailwind CSS** en combinación con **Shadcn-Vue o Nuxt UI**.
- **FR-003**: La arquitectura de la base de datos PostgreSQL MUST soportar y emplear de forma nativa la estrategia de aislamiento **Schema-per-tenant**, existiendo un esquema `public` para datos globales (como subdominios) y esquemas aislados por institución.
- **FR-004**: El servicio de autenticación MUST implementar un endpoint público (`GET /api/v1/tenants/branding?subdomain=...`) para resolver y retornar los datos estéticos de una empresa en el esquema público antes del login.
- **FR-005**: El proceso de login MUST integrar una validación de aislamiento cruzando rigurosamente el `company_id` del usuario con el de la empresa activa del subdominio solicitado.
- **FR-006**: La respuesta de login exitoso MUST retornar un JWT como cookie httpOnly (Secure, SameSite=Strict) y un payload con los atributos de acceso del usuario incluyendo roles y permisos bajo el estándar del ecosistema de Spatie en Laravel (adaptado a NestJS).
- **FR-007**: El backend MUST proveer un endpoint autenticado `GET /api/v1/auth/me` que valide el JWT de la cookie httpOnly y retorne los datos actualizados del usuario, roles y permisos, permitiendo rehidratar la sesión del frontend tras un page refresh.
- **FR-008**: El `TenantMiddleware` MUST resolver la traducción de subdominio a `tenantSchema` consultando la tabla `companies` en el esquema `public` y seteando el valor en CLS (Continuation Local Storage) para que `TenantService.runInTenant()` pueda operar correctamente.
- **FR-009**: El backend MUST exponer un endpoint protegido `POST /api/v1/admin/companies` (accesible solo por super-administradores) para crear nuevas empresas. Este endpoint MUST registrar la empresa en `companies` y ejecutar automáticamente la provisión del schema PostgreSQL (`CREATE SCHEMA tenant_<company_id>`) con las migraciones base del tenant.
- **FR-010**: Para la versión 1, el sistema MUST operar con un único rol `admin` que posea todos los permisos del sistema. La expansión a roles granulares (coordinador, docente, etc.) queda diferida a una iteración futura.

### Structural Constraints (Critical)

- **CR-001**: **Clean Architecture UI**: El frontend MUST estructurarse separando de forma estricta los componentes visuales "tontos" (que solo reciben props y emiten eventos) de la lógica de dominio o reglas de negocio que residirán en Composables y Stores de Pinia.

### Key Entities

- **companies**: (Esquema público) Entidad que registra el `subdomain`, `commercial_name`, `logo_url` y `primary_color` de los tenants. Es la fuente de verdad para resolver subdominios y branding.
- **users**: (Esquema del tenant) Contiene las credenciales e identidad administrativa, estrictamente vinculada a un `company_id`.
- **roles / permissions / model_has_roles**: (Esquema del tenant) Tablas del estándar Spatie para el mapeo RBAC (Role-Based Access Control). En V1, solo existirá el rol `admin`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El aislamiento Multi-tenant a nivel de esquema en base de datos impide en un 100% que una query sin cualificar el nombre de un esquema pueda devolver registros pertenecientes a otro tenant.
- **SC-002**: Pruebas de integración E2E automatizadas validan que los intentos de inicio de sesión cruzados (Usuario de Tenant A intentando entrar en el subdominio del Tenant B) fallan consistente y correctamente.
- **SC-003**: El frontend base es responsivo, aplica skeletons de carga para operaciones asíncronas de red, e integra los temas de color (theming B2B) provistos dinámicamente.
- **SC-004**: La sesión del usuario persiste tras page refresh. El endpoint `GET /auth/me` valida el JWT y rehidrata Pinia exitosamente cuando la cookie es válida, y redirige a login cuando ha expirado.
- **SC-005**: La creación de una nueva empresa vía API resulta en un schema PostgreSQL funcional con las tablas base del tenant, verificable mediante conexión directa a la BD.

## Edge Cases

- **EC-001**: Si el subdominio no corresponde a ninguna empresa registrada, el endpoint de branding MUST retornar un branding por defecto de la plataforma (logo genérico, colores neutros) sin exponer errores internos.
- **EC-002**: Si el `TenantMiddleware` no puede resolver el subdominio a un schema, MUST bloquear la petición con HTTP 400 (Bad Request) antes de que llegue a cualquier controller del tenant.
- **EC-003**: Si un usuario intenta acceder a una URL directa (deep-link) sin sesión activa, el middleware de Nuxt MUST almacenar la ruta destino y redirigir tras login exitoso.

## Assumptions

- Se asume que el ecosistema de base de datos es PostgreSQL 16+.
- Se asume que el backend proveerá mecanismos (middlewares/interceptors en NestJS) para inyectar o sobreescribir el `search_path` de PostgreSQL al esquema correspondiente basado en el JWT del request.
- Se asume que el panel de super-administrador para gestión de empresas opera en un subdominio especial (`admin.odiseo.com`) o en una ruta protegida del esquema público.
- Se asume que para V1, la creación de usuarios admin dentro de un tenant se hará de forma manual (seed/script) y no mediante una UI de gestión de usuarios.

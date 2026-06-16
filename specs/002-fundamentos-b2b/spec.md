# Feature Specification: Fundamentos y Autenticación B2B

**Feature Branch**: `002-fundamentos-b2b`

**Created**: 2026-06-15

**Status**: Draft

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

1. **Given** que un usuario ingresa la URL de un subdominio específico de cliente, **When** la aplicación Frontend (Nuxt) carga la vista de Login, **Then** invoca una consulta al esquema global y muestra dinámicamente el branding (nombre, logo, colores) de dicho subdominio consultando la tabla `clientes_empresas`.
2. **Given** que el usuario introduce sus credenciales, **When** el backend autentica la petición, **Then** verifica incondicionalmente que el `company_id` del usuario (tabla `users`) coincida de forma exacta con la empresa dueña del subdominio activo.

---

### User Story 3 - Aislamiento Frontend y RBAC (Priority: P1)

Como usuario ya autenticado, quiero que la interfaz gráfica (UI) se adapte automáticamente a mis permisos (RBAC), mostrando u ocultando opciones de navegación para las cuales no tengo autorización, de manera que la experiencia sea segura y enfocada en mi rol.

**Independent Test**: Autenticación con un usuario que posee permisos restringidos (ej. solo `view_reports`). Verificación visual de que el menú de generación de materiales está oculto. Intento manual de navegar hacia la ruta protegida `/materials/curation` y comprobación de que el Middleware global redirige o bloquea con error HTTP 403.

**Acceptance Scenarios**:

1. **Given** una sesión B2B válida tras un login exitoso, **When** Nuxt inicializa la aplicación, **Then** el store local de Pinia se hidrata con los roles y permisos del ecosistema Spatie (`roles`, `permissions`) devueltos por el backend.
2. **Given** una ruta protegida en el frontend, **When** el usuario intenta navegar hacia ella careciendo del permiso o rol explícito, **Then** el middleware global de Vue Router interrumpe la navegación arrojando un error 403 (Acceso Denegado).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El proyecto MUST establecer una base (Core Setup) en **NestJS** para el Backend y **Vue 3 / Nuxt 3** para el Frontend.
- **FR-002**: El Frontend MUST adoptar un Design System orientado a B2B SaaS, utilizando **Tailwind CSS** en combinación con **Shadcn-Vue o Nuxt UI**.
- **FR-003**: La arquitectura de la base de datos PostgreSQL MUST soportar y emplear de forma nativa la estrategia de aislamiento **Schema-per-tenant**, existiendo un esquema `public` para datos globales (como subdominios) y esquemas aislados por institución.
- **FR-004**: El servicio de autenticación MUST implementar un endpoint público (`GET /api/v1/tenants/branding?subdomain=...`) para resolver y retornar los datos estéticos de una empresa en el esquema público antes del login.
- **FR-005**: El proceso de login MUST integrar una validación de aislamiento cruzando rigurosamente el `company_id` del usuario con el de la empresa activa del subdominio solicitado.
- **FR-006**: La respuesta de login exitoso MUST retornar un payload que contenga los atributos de acceso del usuario incluyendo los roles y permisos bajo el estándar del ecosistema de Spatie en Laravel (adaptado a NestJS).

### Structural Constraints (Critical)

- **CR-001**: **Clean Architecture UI**: El frontend MUST estructurarse separando de forma estricta los componentes visuales "tontos" (que solo reciben props y emiten eventos) de la lógica de dominio o reglas de negocio que residirán en Composables y Stores de Pinia.

### Key Entities

- **clientes_empresas**: (Esquema público) Entidad que registra el `subdominio`, `nombre_comercial`, `logo_url` y `primary_color` de los tenants.
- **users**: Contiene las credenciales e identidad administrativa, estrictamente vinculada a un `company_id`.
- **roles / permissions / model_has_roles**: Tablas del estándar Spatie para el mapeo RBAC (Role-Based Access Control).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El aislamiento Multi-tenant a nivel de esquema en base de datos impide en un 100% que una query sin cualificar el nombre de un esquema pueda devolver registros pertenecientes a otro tenant.
- **SC-002**: Pruebas de integración E2E automatizadas validan que los intentos de inicio de sesión cruzados (Usuario de Tenant A intentando entrar en el subdominio del Tenant B) fallan consistente y correctamente.
- **SC-003**: El frontend base es responsivo, aplica skeletons de carga para operaciones asíncronas de red, e integra los temas de color (theming B2B) provistos dinámicamente.

## Assumptions

- Se asume que el ecosistema de base de datos es PostgreSQL 16+.
- Se asume que el backend proveerá mecanismos (middlewares/interceptors en NestJS) para inyectar o sobreescribir el `search_path` de PostgreSQL al esquema correspondiente basado en el token del request.

# Research Phase: Fundamentos y Autenticación B2B

## Decisiones Arquitectónicas y Rationale

### Decisión 1: JWT con Cookie httpOnly (no localStorage)

- **Decisión**: Los tokens JWT se emiten como cookies httpOnly con flags Secure y SameSite=Strict.
- **Rationale**: Las cookies httpOnly no son accesibles por JavaScript (inmunes a XSS). SameSite=Strict previene CSRF. Es el estándar moderno para SPAs con backend propio.
- **Alternativas consideradas**:
  - `localStorage`: Vulnerable a XSS. Descartado.
  - Sesiones server-side (Redis): Requiere infraestructura adicional y no es stateless. Descartado.

### Decisión 2: Resolución de Tenant en Middleware (CLS)

- **Decisión**: El `TenantMiddleware` consulta `clientes_empresas` en esquema `public` para traducir subdomain → company_id → `tenant_<company_id>` y lo almacena en CLS (Continuation Local Storage).
- **Rationale**: Una sola consulta por request, antes de que cualquier controller se ejecute. CLS (via `nestjs-cls`) propaga el contexto a través de la cadena de middlewares/guards/services sin pasar parámetros explícitos.
- **Alternativas consideradas**:
  - Resolver en Guard post-auth: No funciona para endpoints públicos (branding). Descartado.
  - Resolver en cada Repository: Código duplicado, propenso a errores. Descartado.

### Decisión 3: Provisión Automática de Schemas

- **Decisión**: El endpoint `POST /api/v1/admin/companies` ejecuta `CREATE SCHEMA tenant_<company_id>` y corre las migraciones base del tenant de forma atómica.
- **Rationale**: Elimina la necesidad de intervención manual de DevOps para cada nuevo cliente. La atomicidad garantiza que no queden schemas a medio crear.
- **Alternativas consideradas**:
  - Script CLI manual: Válido para v1 pero no escala. Se mantiene como fallback.
  - Terraform/IaC: Overkill para la primera fase. Diferido.

### Decisión 4: RBAC con Spatie Pattern (NestJS)

- **Decisión**: Adaptar el patrón de tablas de Spatie (roles, permissions, model_has_roles, model_has_permissions) a NestJS. En V1, solo existe el rol `admin` con todos los permisos.
- **Rationale**: Spatie es el estándar de facto para RBAC en el ecosistema Laravel. Reusar su esquema de tablas facilita la migración futura y es familiar para el equipo.
- **Alternativas consideradas**:
  - CASL.js: Potente pero agrega complejidad innecesaria para V1. Diferido.
  - Custom RBAC hardcoded: No escalable. Descartado.

### Decisión 5: Rehidratación de Sesión via `/auth/me`

- **Decisión**: Al cargar la app, Nuxt ejecuta `GET /api/v1/auth/me` (con la cookie enviada automáticamente) para rehidratar el store de Pinia.
- **Rationale**: La cookie httpOnly se envía automáticamente por el browser. El frontend solo necesita un endpoint para obtener los datos del usuario. Es el patrón estándar de SPAs con auth basada en cookies.
- **Alternativas consideradas**:
  - `pinia-plugin-persistedstate` con `localStorage`: Persiste el estado pero no valida si el JWT sigue vigente. Descartado como única solución.
  - SSR con `useRequestHeaders`: Viable pero agrega complejidad server-side. Diferido.

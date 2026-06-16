# Technical Plan: Módulo 2 - Catálogos Simplificados y Gestión del Tiempo Académico

## Tech Stack Requirements
- **Backend**: NestJS, TypeORM, `@nestjs/sqs` (AWS SQS), PostgreSQL 16.
- **Frontend**: Nuxt 3, Vue 3 (Composition API), Tailwind CSS, Nuxt UI/Shadcn-Vue.
- **Pattern**: Clean Architecture (Use Cases, Repositories), Persistencia Híbrida.

## Architecture Pattern
- **Patrón Repositorio Estricto**: Abstracción de acceso a datos para garantizar que los Use Cases ignoren la tecnología de persistencia.
- **Persistencia Híbrida**: 80% TypeORM para consultas estándar (inyección de `search_path` dinámica), 20% Raw SQL (ejecutado dentro del repositorio subyacente) para sincronización masiva de SQS o inserciones complejas.

## Component Design
### Backend (NestJS)
1. **Catalog Module (`courses`, `topics`, `subtopics`)**:
   - `CatalogController`: Endpoints `GET` y `PATCH` para listar y actualizar visibilidad y alias.
   - `CatalogUseCase`: Lógica de negocio (aislado de TypeORM).
   - `CatalogRepository`: Interfaz `ICatalogRepository` e implementación híbrida `CatalogRepositoryImpl`.
2. **SqsConsumer Module**:
   - `SqsCatalogConsumer`: `@SqsMessageHandler()` que lee los eventos de AWS SQS (`TopicCreated`, `TopicUpdated`).
   - Llama a `CatalogRepository.upsertFromCore()` ejecutando Raw SQL para inserciones/actualizaciones atómicas (`ON CONFLICT (id) DO UPDATE SET core_name = EXCLUDED.core_name`).
3. **AcademicTime Module (`cycle`, `cycle_weeks`)**:
   - `AcademicTimeController`: Endpoints completos `GET, POST, PATCH`. El endpoint de eliminación (`DELETE` o desactivación) solo invoca el soft-delete semántico de semanas.

### Frontend (Nuxt/Vue)
1. **Taxonomía UI (`pages/catalogs/index.vue`)**:
   - Tabla interactiva o lista anidada. Muestra `core_name`, input editable para `local_alias` y switch/toggle para `is_active`.
2. **Tableros de Ciclos (`pages/academic-time/index.vue`)**:
   - Interfaz de cuadrícula. Al eliminar una semana, se muestra tachada o grisada en lugar de colapsar la tabla.

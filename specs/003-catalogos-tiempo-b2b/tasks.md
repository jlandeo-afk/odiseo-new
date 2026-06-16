# Tasks: Módulo 2 - Catálogos y Tiempo Académico

**Input**: Design documents from `/specs/003-catalogos-tiempo-b2b/`
**Organization**: Vertical Slicing. Parallel tasks marked with [P].

## Phase 1: Entidades y Repositorios Híbridos (Taxonomía)
- [ ] T001 [P] [US1] Backend: Crear entidades TypeORM `Course`, `Topic`, `Subtopic` asegurando columnas `core_name` (string) y `local_alias` (string, nullable), con `is_active` (boolean).
- [ ] T002 [US1] Backend: Crear la interfaz abstracta `ICatalogRepository` y su implementación `CatalogRepositoryImpl` inyectando el `TenantService` (Schema-per-tenant).
- [ ] T003 [US1] Backend: Implementar `CatalogUseCase` abstrayendo ORMs, y exponer `CatalogController` con endpoints `GET /api/v1/catalogs` y `PATCH /api/v1/catalogs/:id` (actualización de alias y visibilidad).

## Phase 2: Sincronización SQS (Raw SQL)
- [ ] T004 [P] [US2] Backend: Configurar e instalar `@nestjs/sqs` y `@aws-sdk/client-sqs` preparando el entorno base para consumir colas.
- [ ] T005 [US2] Backend: Añadir método `upsertFromCore(data)` en `CatalogRepositoryImpl` empleando ejecución nativa (Raw SQL `INSERT ... ON CONFLICT DO UPDATE SET core_name = EXCLUDED.core_name`) para preservar los alias locales.
- [ ] T006 [US2] Backend: Crear el servicio `SqsCatalogConsumer` que escuche eventos de sincronización y delegue a los repositorios.

## Phase 3: Gestión del Tiempo Académico
- [ ] T007 [P] [US3] Backend: Crear entidades TypeORM `Cycle` y `CycleWeek` implementando forzosamente la columna `is_active`.
- [ ] T008 [US3] Backend: Crear interfaces, Use Cases y Controllers (`AcademicTimeController`) exponiendo operaciones CRUD y restringiendo la eliminación física en favor del seteo de `is_active = false`.

## Phase 4: Integración Frontend UI
- [ ] T009 [P] [US1] Frontend: Desarrollar la vista `pages/catalogs/index.vue` usando Nuxt UI para listar catálogos permitiendo la edición inline de `local_alias` y toggle de visibilidad.
- [ ] T010 [P] [US3] Frontend: Desarrollar la vista `pages/academic-time/index.vue` y componentes visuales para la gestión de ciclos y "Tableros de Juego", reflejando las semanas inactivas.

## Phase 5: Pruebas y Validación (Obligatorio)
- [ ] T011 [P] Backend Unit Tests: Escribir pruebas unitarias para `CatalogUseCase` garantizando el aislamiento de la capa de persistencia (test usando Mocks de la interfaz `ICatalogRepository`).
- [ ] T012 Backend E2E Tests: Implementar prueba de integración (`catalog.e2e-spec.ts`) que inserte un registro local con un alias, envíe un payload simulado al UseCase de SQS, y afirme que el `core_name` se modificó pero el `local_alias` permaneció intacto.

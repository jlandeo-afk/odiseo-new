# Casos de Prueba: Catálogos y Tiempo Académico

## 1. Unit Tests & Integration Tests

### 1.1 Frontend (Vitest)
- **Componentes (`frontend-vue/src/features/academic-time/components/`)**:
  - `CycleSlideOver.vue`: 
    - Debe emitir el evento `submit` con los datos del formulario válidos.
    - Debe mostrar error de validación si `startDate` está vacío.
    - El botón de cerrar ("X") debe cerrar el diálogo.
  - `WeeksMatrix.vue`:
    - Debe renderizar correctamente la lista de semanas.
    - Al cambiar el toggle de una semana, debe llamar a la API y actualizar el UI optimísticamente.
- **Stores (Pinia)**:
  - `useAcademicTimeStore`:
    - `fetchCycles` debe llamar a la API y actualizar el estado.
    - `createCycle` debe hacer post y luego fetch para refrescar la lista.
  - `useCatalogsStore`:
    - `toggleVisibility` debe actualizar `isActive` del topic correspondiente sin mutar el resto del árbol.

### 1.2 Backend (Jest)
- **`CatalogCronService`**:
  - Debe llamar al Core API (`GET /catalogs`).
  - Debe parsear la respuesta y delegar al repositorio la actualización masiva.
  - Debe loguear error si la API de Core falla.
- **`AcademicTimeUseCase`**:
  - `createCycle` debe calcular correctamente `endDate` basado en `startDate` y `daysPerWeek`.
  - `createCycle` debe crear exactamente `N` semanas continuas.
  - `deleteCycle` debe lanzar `ConflictException` (HTTP 409) si existen sílabos asociados (mockeable).

---

## 2. BDD Scenarios (Gherkin)

### US2: Sincronización Programada (Cron Job)
```gherkin
Feature: Sincronización global de catálogos
  Para garantizar que todos los colegios tengan la taxonomía oficial,
  El sistema de fondo sincronizará los catálogos automáticamente.

  Scenario: Sincronización exitosa desde el Core API
    Given que el Cron Job se ejecuta programadamente
    And el Core API responde con un JSON válido de 50 temas
    When se procesa el payload
    Then el esquema `public` actualiza la tabla `topics` mediante un upsert
    And no se generan errores en los logs
```

### US1: Visibilidad de Taxonomía
```gherkin
Feature: Ocultar temas locales
  Para adaptar el banco a la realidad del colegio,
  El coordinador puede ocultar temas no dictados.

  Scenario: Ocultar un tema existente
    Given que el coordinador está viendo el catálogo de "Álgebra"
    And el tema "Ecuaciones" está activo (sin registro en tenant_topic_visibility)
    When desactiva el toggle de "Ecuaciones"
    Then el backend recibe una petición a `PATCH /api/v1/catalogs/topics/{id}/visibility`
    And se inserta un registro con `is_active = false` en `tenant_topic_visibility`
    And el tema desaparece de la vista general del profesorado
```

### US3: Tableros de Tiempo Académico
```gherkin
Feature: Creación y gestión de ciclos académicos
  Para planificar el año,
  El coordinador puede crear ciclos y autogenerar las semanas.

  Scenario: Creación exitosa de ciclo y semanas
    Given que el coordinador abre el formulario de nuevo ciclo
    When ingresa "Ciclo 2026", "2026-03-01", 16 semanas y 5 días hábiles
    And hace clic en Guardar
    Then el backend calcula la fecha fin del ciclo
    And se guardan 16 registros secuenciales en `cycle_weeks`
    And la Semana 2 inicia el "2026-03-08"

  Scenario: Soft delete fallido por dependencias
    Given que existe un ciclo con ID "c-123"
    And el ciclo "c-123" tiene sílabos atados
    When el administrador intenta hacer un DELETE físico
    Then el sistema arroja el error 409 Conflict
    And sugiere usar la desactivación (`is_active = false`) en su lugar

### US4: Configuración de Perfiles de Material (Plantillas)
- **`AcademicTimeUseCase` (Material Templates)**:
  - `createTemplate` debe crear un perfil de material con su nombre, alcance y cuotas por curso asociadas.
  - `createTemplate` debe validar que la cantidad de preguntas de cada curso sea mayor a 0.
  - `updateTemplate` debe actualizar correctamente las cuotas de preguntas por curso, aplicando reemplazo limpio.
  - `deleteTemplate` debe eliminar el perfil y propagar la eliminación en cascada de sus cuotas asociadas.

---

## 3. BDD Scenarios (Gherkin) para US4

### US4: Configuración de Perfiles de Material
```gherkin
Feature: Configuración de Perfiles de Material (Plantillas)
  Para automatizar la generación de materiales académicos,
  El coordinador quiere configurar plantillas de evaluación asignando cuotas de preguntas a cada curso.

  Scenario: Creación exitosa de plantilla de material
    Given que el coordinador está en la pestaña de Plantillas de un ciclo activo
    When crea una plantilla con nombre "Examen Quincenal", alcance "ACCUMULATIVE", acumulación de 2 semanas
    And asigna la cuota de "10" preguntas al curso "Álgebra"
    And hace clic en Guardar
    Then el backend inserta el perfil en `cycle_material_templates`
    And inserta la cuota de "10" preguntas en `cycle_material_template_courses`

  Scenario: Edición de plantilla modificando cuotas de cursos
    Given que existe la plantilla "Práctica Semanal" con cuota "5" para "Álgebra"
    When el coordinador edita la plantilla y cambia la cuota de "Álgebra" a "8"
    And hace clic en Guardar
    Then el backend actualiza la plantilla
    And reemplaza las cuotas viejas por la nueva cuota de "8" preguntas
```
```

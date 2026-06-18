# Quickstart Validation Guide

Este documento proporciona los comandos y escenarios necesarios para validar que la funcionalidad de Catálogos Simplificados y Tiempo Académico ha sido implementada correctamente.

## Prerequisites

1. PostgreSQL en ejecución con el esquema `public` y al menos un esquema de tenant (ej. `tenant_test`).
2. Backend (NestJS) en ejecución (`npm run start:dev` en `backend-nestjs`).
3. Frontend (Nuxt/Vue) en ejecución (`npm run dev` en `frontend-vue`).
4. Autenticación configurada (usar token de prueba con permisos `view_catalogs` y `manage_academic_time`).

## Validation Scenarios

### Scenario 1: Sincronización de Catálogos (Cron Job)

**Objective**: Verificar que el backend consulta el Core API y guarda los datos en el esquema `public`.

**Steps**:
1. Provocar la ejecución del Cron Job manualmente mediante un trigger interno de NestJS o esperando su ciclo.
2. Verificar en la base de datos que las tablas `public.courses`, `public.topics` y `public.subtopics` contienen datos idénticos a la respuesta de la API Core.

**Expected Outcome**:
Los datos existen solo en `public`. El esquema de tenant no contiene tablas de catálogo (salvo `tenant_topic_visibility`).

### Scenario 2: Ocultar un Topic

**Objective**: Comprobar que un coordinador puede ocultar un tema sin borrarlo globalmente.

**Steps**:
1. En el Frontend, ir a la vista de Catálogos.
2. Desactivar el toggle de visibilidad del topic "Ecuaciones Diferenciales".
3. Refrescar la página.

**Expected Outcome**:
La API retorna `PATCH /api/v1/catalogs/topics/:id/visibility` con `isActive = false`. En la BD, se insertó un registro en `tenant_topic_visibility`. El tema ya no se ve en la vista principal operativa, pero sigue en el modo edición.

### Scenario 3: Creación de Ciclo (Auto-generación de fechas)

**Objective**: Verificar que el cálculo de semanas y fechas funciona de forma matemáticamente exacta.

**Steps**:
1. En el UI, crear un ciclo con: `startDate = 2026-03-01`, `totalWeeks = 4`, `daysPerWeek = 5`.
2. Presionar Guardar.

**Expected Outcome**:
La API crea el ciclo y 4 semanas. 
- La Semana 1 inicia el `2026-03-01` y termina el `2026-03-05`.
- La Semana 2 inicia el `2026-03-08` y termina el `2026-03-12`.
El backend calcula todo de forma asíncrona y la UI se actualiza con la matriz de semanas.

### Scenario 4: Intento de Eliminación de Ciclo

**Objective**: Validar que la regla de soft-delete condicional funciona.

**Steps**:
1. Intentar borrar un ciclo vacío recién creado (`DELETE /api/v1/academic-time/cycles/:id`).
2. Comprobar que la respuesta es 200 OK y en la BD aparece como `is_active = false`.
3. Intentar borrar un ciclo que haya sido vinculado artificialmente a un syllabus en la BD.
4. Comprobar que la respuesta es `409 Conflict`.

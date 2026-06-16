# Specification: Módulo 2 - Catálogos Simplificados y Gestión del Tiempo Académico

## Core Objectives
- Proveer una Taxonomía Minimalista Pre-cargada (MDM) clonada del Core API (`courses`, `topics`, `subtopics`).
- Mantener la persistencia híbrida usando Raw SQL para sincronización asíncrona (Amazon SQS) y TypeORM para lectura/actualización local.
- Habilitar la Gestión del Tiempo Académico a través de CRUD local para `cycle` y `cycle_weeks` con soft deletes semánticos obligatorios.

## User Stories (Features)
- **US1: Gestión de Alias y Visibilidad de Taxonomía**: Como administrador del tenant, quiero poder ocultar temas (`is_active = false`) y asignar nombres personalizados (`local_alias`) a los `topics` y `subtopics`, sin afectar el `core_name` original, para adaptar el banco global a la currícula de mi colegio.
- **US2: Sincronización Asíncrona Global**: Como sistema, necesito un Consumer de SQS en NestJS que procese actualizaciones del Banco Global, insertando nuevos registros o actualizando exclusivamente la columna `core_name` en el esquema del tenant sin sobrescribir los alias locales.
- **US3: Tableros de Tiempo Académico**: Como coordinador académico, quiero crear y gestionar Ciclos (`cycle`) y definir las Semanas del Ciclo (`cycle_weeks`). Si una semana es feriado o inactiva, quiero marcarla como inactiva en lugar de eliminarla, para mantener intacta la cuadrícula de planificación en el frontend.

## Functional Requirements
- **FR-001**: La base de datos del tenant contendrá solo las tablas de catálogo: `courses`, `topics`, `subtopics`. No deben existir tablas locales para Universidades, Áreas o Modalidades; estas son de uso exclusivo del Banco Global en fase de generación.
- **FR-002**: Las tablas locales de taxonomía expondrán columnas de solo lectura `core_name` y columnas modificables `local_alias` (nullable) e `is_active` (boolean, default true).
- **FR-003**: El Frontend NO debe exponer operaciones de creación (POST) ni eliminación física o lógica completa (DELETE) para la taxonomía base, solo actualización de alias y visibilidad (PATCH).
- **FR-004**: El servicio de NestJS debe consumir colas de Amazon SQS para insertar nuevos nodos en la taxonomía o actualizar el `core_name` de los existentes.
- **FR-005**: La eliminación de `cycle_weeks` en el Backend está prohibida (restricción a nivel de código); debe aplicarse una actualización de estado (`is_active = false/null`).

## Structural Constraints (Critical)
- **CR-001**: Los Casos de Uso (Use Cases) en NestJS tienen estrictamente prohibido interactuar con el ORM directamente. Solo pueden interactuar con las interfaces abstractas de los repositorios.
- **CR-002**: Se debe emplear una Estrategia de Persistencia Híbrida: Raw SQL para la actualización masiva/batch del Consumer SQS y TypeORM para el CRUD estándar y resolución de `search_path`.

## Success Criteria
- **SC-001**: Los catálogos pueden personalizarse visualmente en el UI, mostrando `local_alias` si existe, o cayendo a `core_name` si no.
- **SC-002**: El Worker SQS puede actualizar el `core_name` de un `topic` sin sobrescribir su `local_alias`.
- **SC-003**: La eliminación de una semana vacacional en la UI no borra el registro de BD, permitiendo mantener la integridad posicional de los sílabos en todo momento.

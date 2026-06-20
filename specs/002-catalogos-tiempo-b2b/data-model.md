# Data Model: Catálogos Simplificados y Tiempo Académico

## Esquema Público (`public`)
Contiene la taxonomía inmutable y global, sincronizada vía Cron Job desde el Core API.

### `public.courses`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único del curso |
| `name` | VARCHAR(255) | NOT NULL | Nombre oficial del curso (ej. Álgebra) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de última actualización |

### `public.topics`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único del tema |
| `course_id` | UUID | FK -> courses.id | Curso al que pertenece |
| `name` | VARCHAR(255) | NOT NULL | Nombre oficial del tema |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de última actualización |

### `public.subtopics`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador único del subtema |
| `topic_id` | UUID | FK -> topics.id | Tema al que pertenece |
| `name` | VARCHAR(255) | NOT NULL | Nombre oficial del subtema |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de última actualización |

---

## Esquema del Tenant (`tenant_xyz`)
Contiene los datos transaccionales específicos de cada colegio.

### `tenant_xyz.tenant_topic_visibility`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `topic_id` | UUID | PK, FK -> public.topics.id | El tema que se está modificando |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT FALSE | Solo existen registros si el tenant decidió ocultar el tema |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de actualización |

*(Nota: Si no existe registro para un topic_id, se asume is_active = true por defecto en la UI)*

### `tenant_xyz.cycles`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador del ciclo |
| `name` | VARCHAR(255) | NOT NULL | Ej. "Ciclo Verano 2026" |
| `year` | INTEGER | NOT NULL | Año académico |
| `start_date` | DATE | NOT NULL | Fecha de inicio del ciclo |
| `end_date` | DATE | NOT NULL | Fecha fin (calculada automáticamente) |
| `days_per_week` | INTEGER | NOT NULL | Días efectivos de clases (ej. 5 o 6) |
| `total_weeks` | INTEGER | NOT NULL | Total de semanas del ciclo |
| `is_active` | BOOLEAN | DEFAULT TRUE | Estado del ciclo (Soft delete) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

### `tenant_xyz.cycle_weeks`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador de la semana |
| `cycle_id` | UUID | FK -> cycles.id | Ciclo padre |
| `week_number` | INTEGER | NOT NULL | Semana 1, 2, 3... |
| `start_date` | DATE | NOT NULL | Calculado: cycle.start + (N-1)*7 |
| `end_date` | DATE | NOT NULL | Calculado: start_date + days - 1 |
| `is_active` | BOOLEAN | DEFAULT TRUE | Si es false, representa un feriado/semana muerta |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

### `tenant_xyz.cycle_material_profiles`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador del perfil |
| `cycle_id` | UUID | FK -> cycles.id | Ciclo padre al que pertenece el perfil |
| `name` | VARCHAR(255) | NOT NULL | Ej. "Práctica Semanal" |
| `scope` | VARCHAR(50) | NOT NULL | CURRENT_WEEK, ACCUMULATIVE o FULL_ACCUMULATIVE |
| `accumulation_weeks` | INTEGER | NULL | Cantidad de semanas si es acumulativo |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

### `tenant_xyz.cycle_material_profile_courses`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Identificador de la cuota |
| `profile_id` | UUID | FK -> cycle_material_profiles.id | Perfil al que pertenece |
| `course_id` | UUID | FK -> public.courses.id | Curso configurado |
| `questions_quantity` | INTEGER | NOT NULL | Cantidad de preguntas a extraer para este curso |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

## Reglas de Integridad y Triggers

1. **Delete Protection**: Un ciclo no puede ser eliminado (física o lógicamente) si existen IDs de `cycles` registrados en la tabla de `syllabus` (fuera del alcance de este módulo, pero clave para la arquitectura).
2. **Cascada**: Si un ciclo se marca `is_active = false`, sus `cycle_weeks` no cambian en base de datos, pero la lógica de negocio las considerará inactivas heredando el estado del padre.

# Data Model: Catálogos y Tiempo Académico

## Entity Relationship Diagram

```mermaid
erDiagram
    COURSES ||--o{ TOPICS : "course_id"
    TOPICS ||--o{ SUBTOPICS : "topic_id"
    CYCLES ||--o{ CYCLE_WEEKS : "cycle_id"

    COURSES {
        uuid id PK
        string core_name "Readonly - from Core API"
        boolean is_active "Default true"
        timestamp created_at
        timestamp updated_at
    }

    TOPICS {
        uuid id PK
        uuid course_id FK
        string core_name "Readonly - from Core API"
        string local_alias "Nullable - tenant customization"
        boolean is_active "Default true - toggleable"
        timestamp created_at
        timestamp updated_at
    }

    SUBTOPICS {
        uuid id PK
        uuid topic_id FK
        string core_name "Readonly - from Core API"
        boolean is_active "Default true"
        timestamp created_at
        timestamp updated_at
    }

    CYCLES {
        uuid id PK
        string name "e.g. Ciclo 2026-I"
        integer year
        date start_date "Input by admin"
        date end_date "Auto-calculated"
        integer days_per_week "e.g. 5, 6, 7"
        integer total_weeks "e.g. 16"
        boolean is_active "Default true"
        timestamp created_at
        timestamp updated_at
    }

    CYCLE_WEEKS {
        uuid id PK
        uuid cycle_id FK
        integer week_number "Sequential 1..N"
        date start_date "Calculated from cycle"
        date end_date "Calculated from cycle"
        boolean is_active "Default true - soft delete"
        timestamp created_at
        timestamp updated_at
    }
```

## Schema Distribution

Todas las entidades residen en el schema del tenant (`tenant_<company_id>`).

## Validation Rules

| Campo | Regla |
|-------|-------|
| `topics.local_alias` | Nullable, max 200 chars. Si null, UI muestra `core_name` |
| `subtopics` | No tiene `local_alias` — read-only |
| `cycles.days_per_week` | Integer 1-7 |
| `cycles.total_weeks` | Integer 1-52 |
| `cycles.start_date` | Valid date, not in the past |
| `cycles.end_date` | Auto-calculated: `start_date + (total_weeks × days_per_week) days` |
| `cycle_weeks.is_active` | Cannot DELETE row, only toggle is_active |

## Display Name Resolution (Frontend)

```
displayName = topic.local_alias ?? topic.core_name
```

For subtopics: always `subtopic.core_name` (no alias).

# Data Model: Gestión de Sílabos

```mermaid
erDiagram
    SYLLABUS ||--o{ SYLLABUS_DISTRIBUTION : "syllabus_id"
    CYCLES ||--|| SYLLABUS : "cycle_id"
    COURSES ||--|| SYLLABUS : "course_id"
    TOPICS ||--o{ SYLLABUS_DISTRIBUTION : "topic_id"
    SUBTOPICS ||--o{ SYLLABUS_DISTRIBUTION : "subtopic_id"

    SYLLABUS {
        uuid id PK
        uuid cycle_id FK
        uuid course_id FK
        string name
        boolean is_active "Default true"
        timestamp created_at
        timestamp updated_at
    }

    SYLLABUS_DISTRIBUTION {
        uuid id PK
        uuid syllabus_id FK
        integer week_number
        uuid topic_id FK
        uuid subtopic_id FK
        integer question_count "CHECK > 0"
        timestamp created_at
        timestamp updated_at
    }
```

## Constraints

- UNIQUE: (`syllabus_id`, `week_number`, `topic_id`, `subtopic_id`)
- CHECK: `question_count > 0`
- CHECK: Sum of `question_count` per `week_number` <= 100
- No CASCADE DELETE on distributions when syllabus is deactivated

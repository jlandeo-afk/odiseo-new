# Data Model: Generación y Revisión de Materiales

```mermaid
erDiagram
    MATERIAL_REQUESTS ||--o{ MATERIAL_REQUEST_COURSES : "material_request_id"
    MATERIAL_REQUESTS ||--o{ MATERIAL_REVIEW_QUESTIONS : "material_request_id"
    USERS ||--o{ MATERIAL_REQUESTS : "created_by"

    MATERIAL_REQUESTS {
        uuid id PK
        string tenant_id
        uuid profile_id "Ref to Spec 002 (cycle_material_profiles)"
        integer week_number
        enum status "PENDING | IN_REVIEW | PROCESSING | REVIEW_REQUIRED | COMPLETED | COMPLETED_WITH_WARNINGS | FAILED"
        boolean requires_review
        uuid created_by FK "Ref to users"
        timestamp created_at
        timestamp updated_at
    }

    MATERIAL_REQUEST_COURSES {
        uuid id PK
        uuid material_request_id FK "Ref to material_requests"
        string course_id "Ref to Core API/Academic Cycle"
        enum status "PENDING | PROCESSING | COMPLETED | COMPLETED_WITH_WARNINGS | FAILED"
        string download_url "Nullable - S3 presigned URL"
        jsonb warnings "Nullable - list of shortages/errors for this course"
        timestamp created_at
    }

    MATERIAL_REVIEW_QUESTIONS {
        uuid id PK
        uuid material_request_id FK "Ref to material_requests"
        string question_id "Ref to Core API"
        uuid topic_id FK "Ref to syllabus_distribution"
        uuid subtopic_id FK "Ref to syllabus_distribution"
        integer position "Order in PDF"
        enum status "FOUND | EMPTY | REPLACED | REMOVED"
        timestamp created_at
    }
```

## Convenciones de Base de Datos (Database Conventions)
De acuerdo con la **Constitución de Odiseo**:
- Todos los nombres de tablas, columnas y claves primarias/foráneas están definidos exclusivamente en inglés y utilizando `snake_case`.
- Cada tenant tiene su propio esquema aislado (modelo multi-tenant Schema-per-tenant). Por ende, las tablas anteriores residen dentro de cada esquema de tenant.
- La tabla `material_requests` mantiene la trazabilidad de la solicitud general y sus estados de auditoría, mientras que `material_request_courses` maneja la granularidad física de los archivos generados y sus URLs.

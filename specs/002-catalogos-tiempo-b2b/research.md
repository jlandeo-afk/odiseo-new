# Research Phase: Catálogos y Tiempo Académico

## Decisiones Arquitectónicas y Rationale

### Decisión 1: Subtopics son Read-Only (sin local_alias)

- **Decisión**: Los subtopics NO tienen `local_alias` editable. Solo los topics permiten personalización local.
- **Rationale**: Los subtopics provienen del banco base (Core API) y representan la granularidad más fina de la taxonomía. Editarlos crearía inconsistencias con el Core al momento de solicitar preguntas. Los topics sí tienen alias porque representan la agrupación que cada colegio puede nombrar según su currícula.
- **Alternativas consideradas**: Alias en subtopics — descartado por riesgo de desincronización con el Core API.

### Decisión 2: Persistencia Híbrida (TypeORM + Raw SQL)

- **Decisión**: 80% TypeORM para CRUD estándar, 20% Raw SQL para operaciones SQS.
- **Rationale**: TypeORM maneja bien el CRUD con search_path dinámico. Pero `INSERT ... ON CONFLICT DO UPDATE` con preservación selectiva de columnas es más limpio y performante en Raw SQL que con QueryBuilder.
- **Alternativas consideradas**: 100% TypeORM con `upsert()` — no preserva `local_alias` elegantemente.

### Decisión 3: Auto-generación de semanas al crear ciclo

- **Decisión**: Al crear un ciclo con `total_weeks` y `days_per_week`, el sistema calcula `end_date` y genera N registros de `cycle_weeks` automáticamente.
- **Rationale**: Mejor UX — el admin no tiene que crear 16 semanas una por una. El cálculo de fechas es determinístico: `end_date = start_date + (total_weeks × days_per_week) días`.
- **Alternativas consideradas**: Creación manual de semanas — descartado por UX pobre.

### Decisión 4: Dead Letter Queue para SQS

- **Decisión**: Configurar DLQ con `maxReceiveCount = 3`. Mensajes que fallen 3 veces van a la DLQ.
- **Rationale**: Garantiza que ningún evento de sincronización se pierda silenciosamente. Los mensajes en DLQ pueden ser auditados y reprocesados.
- **Alternativas consideradas**: Log + skip — pierde mensajes silenciosamente. Descartado.

### Decisión 5: Optimistic UI para mutaciones frontend

- **Decisión**: Todas las mutaciones (alias edit, visibility toggle, week deactivation) usan Optimistic UI con rollback en error.
- **Rationale**: Data-density alta con micro-interacciones requiere respuesta instantánea. Rollback visual mantiene la integridad si el backend falla.

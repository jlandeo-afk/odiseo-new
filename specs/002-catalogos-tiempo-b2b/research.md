# Research & Decisions: Catálogos Simplificados y Tiempo Académico

## 1. Estrategia de Sincronización del Banco Global
- **Decision**: API Polling con Cron Job (`@nestjs/schedule`) centralizado en el esquema `public`.
- **Rationale**: Los catálogos (cursos, temas) cambian muy raramente. Usar SQS era sobreingeniería y requería levantar infraestructura en AWS. Un Cron Job que descargue el catálogo y lo guarde en el esquema `public` compartido por todos los tenants es mucho más eficiente, robusto y fácil de mantener.
- **Alternatives considered**: 
  - *SQS / Eventos Push*: Requiere Worker 24/7 y DLQ. Demasiada complejidad para datos estáticos.
  - *Logical Replication*: Acopla rígidamente los esquemas de bases de datos entre el Core y el B2B.

## 2. Gestión de Nombres Locales (Alias)
- **Decision**: Eliminar por completo el concepto de `local_alias`.
- **Rationale**: Simplifica radicalmente la base de datos y la UI. Garantiza que la taxonomía del B2B sea 100% idéntica a la del Banco Core, asegurando consistencia global sin esfuerzo manual por parte de los coordinadores.
- **Alternatives considered**: 
  - *Alias editables*: Fue la propuesta original de la especificación 001, pero se descartó interactivamente por complejidad innecesaria.

## 3. Visibilidad de Temas por Colegio (Tenant)
- **Decision**: Tabla `tenant_topic_visibility` en el esquema de cada tenant.
- **Rationale**: Como los catálogos ahora residen en el esquema `public` para todos, la única forma de que un colegio oculte un tema (`is_active = false`) es guardar esa preferencia en su propio esquema.
- **Alternatives considered**: 
  - *Duplicar el catálogo en cada tenant*: Altamente ineficiente y difícil de actualizar cuando el banco corrige un nombre.

## 4. Fechas de Ciclos y Semanas
- **Decision**: Fórmula matemática estricta basada en semanas naturales de 7 días.
  - Semana N inicio = `start_date` + (N-1)*7
  - Semana N fin = inicio + `days_per_week` - 1
- **Rationale**: Mantiene las semanas académicas sincronizadas con el calendario del mundo real y automatiza la creación de la cuadrícula de planificación al instante.

## 5. Reglas de Eliminación y Solapamiento de Ciclos
- **Decision**: Se permite solapar fechas de ciclos activos. La eliminación es Soft Delete (`is_active = false`) y bloqueada si existen sílabos atados.
- **Rationale**: Las instituciones suelen tener ciclos paralelos (ej. Mañana vs Noche, Regular vs Intensivo). El soft delete previene la pérdida catastrófica de historial académico.

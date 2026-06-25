# Research & Decisions: Generación de Materiales y Trazabilidad

Esta bitácora documenta las decisiones de arquitectura técnica y producto tomadas durante la fase de clarificación para las Specs 004 (Generación/Revisión) y 005 (Trazabilidad).

## 1. Reglas de Exclusión (Anti-Repetición)
- **Decision**: Exclusión estricta acotada por Ciclo Académico.
- **Rationale**: El "Soft Reset" fue rechazado para evitar una mala experiencia al alumno (repetir preguntas). Se optó por una política estricta donde, si se agota el pool de preguntas de un tema para el ciclo actual, el Core API retorna 0 preguntas y el sistema lo maneja como un "vacío" que el administrador debe resolver en la pantalla de revisión. Las exclusiones se liberan naturalmente al iniciar un nuevo ciclo académico (nuevo `cycle_id`).
- **Alternatives considered**: Soft reset (ignorar reglas temporalmente y reusar preguntas - descartado por feedback), Exclusión por tipo de material (descartado para maximizar variedad real).

## 2. Acuerdo de Nivel de Servicio (SLA)
- **Decision**: SLA end-to-end ≤ 60 segundos.
- **Rationale**: Balance entre la expectativa de respuesta en una plataforma B2B y el tiempo real requerido para solicitar preguntas al Core API, compilar el PDF con Playwright en el Processor BullMQ, subir a S3, y notificar por WebSocket.
- **Alternatives considered**: Sin SLA explícito (dejaba la infraestructura sin lineamientos claros para timeouts).

## 3. Manejo de Autorización
- **Decision**: Diferido a una spec externa de roles y permisos.
- **Rationale**: El módulo asume que el usuario autenticado tiene permisos; el sistema de roles B2B gestionará de forma transversal quién puede generar o revisar.

## 4. Analítica de Preguntas
- **Decision**: Reportes analíticos están fuera del alcance (Out of Scope).
- **Rationale**: La Spec 005 se limita estrictamente a la trazabilidad y ejecución de reglas anti-repetición para no engordar el MVP. Reportes de rotación serán una feature futura.

# Research Phase: Generación de Balotario PDF

## Decisiones Arquitectónicas y Rationale

- **Decisión 1: Ensamblaje Estructurado del SQS Payload en NestJS**
  - *Decisión*: El SaaS B2B asume la responsabilidad de resolver y aplanar toda la jerarquía de requerimientos (Temas > Subtemas > Cantidades) leyendo el Syllabus. El payload JSON de SQS se arma estáticamente con toda esta información.
  - *Rationale*: Se respeta la separación de dominios. El Worker FastAPI, que procesa la cola, no necesita conectarse a la Base de Datos transaccional del B2B para entender la planificación escolar; solo necesita el payload para ejecutar las peticiones limpias al Core API del Banco de Preguntas.

- **Decisión 2: Inyección Temprana de Tenant Metadata**
  - *Decisión*: La información de *branding* del colegio (Nombre Comercial, URL del Logo) viaja adjunta en el mismo mensaje SQS.
  - *Rationale*: Evita realizar queries al esquema transaccional del Tenant durante la fase de compilación del Worker en AWS Fargate.

- **Decisión 3: Segregación Física en Worker (Restricción CR-002 y CR-003)**
  - *Decisión*: El Worker tiene un algoritmo de enrutamiento interno. Si detecta el atributo `exam_areas`, asume el modo `EXAMEN`. Esto invoca un ciclo paralelo que produce documentos físicos independientes por cada área (ej. Cuadernillo Ingeniería, Cuadernillo Medicina).
  - *Rationale*: Se alinea a la exigencia de la directiva de bifurcación, evitando lógica acoplada posterior en el cliente. Todo documento llega a S3 ya separado lógicamente.

- **Decisión 4: Inmutabilidad de Preguntas en la Revisión**
  - *Decisión*: Las preguntas cargadas en la vista de revisión en el SaaS B2B son inmutables en su contenido. Los administradores solo pueden cambiar una pregunta por otra del banco (`REPLACED`) o eliminar el slot (`REMOVED`).
  - *Rationale*: Se preserva la separación de dominios estipulada en la Constitución de Odiseo, impidiendo que el SaaS B2B modifique o almacene texto/imágenes pesadas de reactivos.

- **Decisión 5: Esquema Relacional de Múltiples Cursos**
  - *Decisión*: Se introduce una tabla relacional `material_request_courses` en lugar de guardar URLs y estados en campos JSONB embebidos.
  - *Rationale*: Permite un control preciso de la compilación y descargas por cada curso que compone una solicitud de material, posibilitando descargas independientes y control granular de errores.

- **Decisión 6: Control de Concurrencia Optimista en Revisión**
  - *Decisión*: Se introduce el estado `IN_REVIEW` cuando el administrador accede a la pantalla de revisión. El backend valida mediante un campo de versión o fecha que no se pisen las modificaciones concurrentes de dos administradores.
  - *Rationale*: Previene conflictos y pérdidas de datos si dos administradores abren y modifican la misma revisión simultáneamente.

- **Decisión 7: Expiración de URLs de S3 a las 24h y Retención Permanente**
  - *Decisión*: Las URLs pre-firmadas expiran a las 24 horas. Los archivos se conservan permanentemente en S3.
  - *Rationale*: Si expiran, el backend de NestJS genera una nueva URL pre-firmada al vuelo, ahorrando la compilación costosa del PDF por el Worker.

- **Decisión 8: Exclusión de Preguntas Duplicadas Diferida**
  - *Decisión*: La lógica avanzada de prevención de repetición de preguntas se difiere 100% a la Spec 005.
  - *Rationale*: Simplifica la primera fase de implementación al concentrar la lógica puramente en la extracción y ensamblaje de PDF.

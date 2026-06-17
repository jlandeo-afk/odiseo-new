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

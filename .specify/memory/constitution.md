<!--
Sync Impact Report
- Version change: Initial → 1.0.0
- List of modified principles:
  - Initialized I. Identidad del Proyecto
  - Initialized II. Valores Principales
  - Initialized III. Tech Stack Definitivo
  - Initialized IV. Estándares de Calidad
  - Initialized V. Restricciones de Integración
  - Initialized VI. Supuestos de Escalabilidad
  - Initialized VII. Puntos de Control
  - Initialized VIII. Antipatrones
  - Initialized IX. Métricas de Éxito
- Added sections: Core Principles, Governance
- Removed sections: None
- Templates requiring updates: ✅ None required at this time (templates use dynamic placeholders).
- Follow-up TODOs: None
-->
# Odiseo Constitution

## Core Principles

### I. Identidad del Proyecto (Project Identity)
El ecosistema Odiseo se divide en dos dominios estrictamente separados:
- **Core API (Banco de Preguntas)**: Repositorio global, inmutable y fuente única de verdad para los reactivos, textos de comprensión lectora y saberes previos.
- **Motor de Entrega (SaaS B2B)**: Plataforma de suscripción para empresas clientes que permite la planificación académica, generación de sílabos y creación de materiales, consumiendo los datos del Core API.

### II. Valores Principales (Core Values)
- **Separación de Dominios**: El SaaS B2B NUNCA almacena el contenido pesado de los reactivos ni imágenes multimedia, únicamente guarda referencias lógicas (`question_id`).
- **Clean Architecture**: La lógica de negocio SERÁ independiente de la UI, bases de datos y frameworks externos.
- **Asincronía Extrema**: Todo procesamiento intensivo o ensamblaje de documentos DEBE salir del hilo principal.

### III. Tech Stack Definitivo
- **Motor SaaS B2B**: NestJS (Node.js) con tipado estricto en TypeScript.
- **Core API & IA**: FastAPI (Python) para procesamiento asíncrono y ML.
- **Base de Datos**: PostgreSQL con pgvector y particionamiento nativo.
- **Tiempo Real**: AWS API Gateway WebSockets.
- **Background Jobs**: Orquestación con Amazon SQS y cómputo aislado Serverless mediante AWS ECS (Fargate).

### IV. Estándares de Calidad (Quality Standards)
- Las funciones de base de datos en PostgreSQL DEBEN retornar tipos exactos (específicamente `void` al ejecutar funciones de actualización) y contar con cobertura de pruebas.
- **Convención de nombres en BD**: Todas las tablas, columnas, índices, constraints y funciones en PostgreSQL DEBEN nombrarse exclusivamente en inglés (snake_case). Queda prohibido el uso de nombres en español u otros idiomas en la capa de datos.
- Contratos de API estrictamente definidos mediante OpenAPI/Swagger para la comunicación entre el SaaS y el Core.

### V. Restricciones de Integración (Integration Constraints)
- **Aislamiento físico**: Las empresas operadoras del SaaS B2B JAMÁS tendrán conexión directa a la base de datos global del Banco. La comunicación fluye SOLO a través de REST o eventos de mensajería.

### VI. Supuestos de Escalabilidad (Scalability Assumptions)
- **Modelo Multi-tenant**: Schema-per-tenant en PostgreSQL. Cada empresa u operador reside en su propio esquema de base de datos aislado.
- **Notificaciones Push**: El ensamblaje de materiales notifica su finalización de forma pasiva a los clientes conectados a través de conexiones persistentes gestionadas por AWS API Gateway.

### VII. Puntos de Control (Governance Checkpoints)
- Las modificaciones a la estructura de la base de datos se manejan mediante migraciones automatizadas; los cambios en los esquemas B2B requieren revisión arquitectónica.
- Toda pregunta debe ser verificada o aprobada antes de ser visible en el SaaS.

### VIII. Antipatrones (Anti-Patterns)
- **NUNCA** compilar PDFs de materiales de forma síncrona dentro de los microservicios del SaaS.
- **NUNCA** eliminar semanas inactivas en la lógica de gestión de ciclos; deben preservarse en la base de datos como registros null para mantener la alineación estricta con el frontend.
- **NUNCA** utilizar Row-level Tenancy para aislar la data principal en el motor B2B.

### IX. Métricas de Éxito (Success Metrics)
- Cero fugas de datos (data leaks) entre las sesiones y registros de distintas empresas B2B.
- Latencia en tiempo real para notificaciones de trabajos en background.

## Governance

- **Amendment Procedure**: Las enmiendas requieren documentación, revisión arquitectónica y un plan de migración si afectan al SaaS B2B o Core API.
- **Versioning Policy**: Sigue SemVer (MAJOR para cambios arquitectónicos incompatibles, MINOR para nuevas guías, PATCH para correcciones menores).
- **Compliance Review**: Todos los PRs deben verificar el cumplimiento con las restricciones de integración, separación de dominios y asincronía extrema. El incumplimiento de los antipatrones será causa de rechazo de PR.

**Version**: 1.0.0 | **Ratified**: 2026-06-14 | **Last Amended**: 2026-06-14

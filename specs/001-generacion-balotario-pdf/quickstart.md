# Quickstart: Generación de Balotario PDF

Guía de validación end-to-end del flujo asíncrono.

## Prerequisites

1. **LocalStack o AWS Setup**:
   Necesitas una cola SQS y un bucket S3.
   ```bash
   # Utilizando awslocal (LocalStack)
   awslocal sqs create-queue --queue-name odiseo-materials-queue
   awslocal s3 mb s3://odiseo-materials
   ```
2. **Entorno de Red Local**: El Backend B2B y el Worker FastAPI deben estar corriendo y poderse conectar a las herramientas AWS mockeadas.

## Validation Steps

### 1. Iniciar los servicios
En tu terminal 1 (SaaS B2B):
```bash
cd backend-nestjs
npm run start:dev
```

En tu terminal 2 (Worker Fargate local):
```bash
cd worker-fastapi
uvicorn main:app --reload
```

### 2. Disparar Petición HTTP
Ejecuta la llamada para encolar la creación del examen. Valida que el servicio retorna HTTP 202 inmediatamente:

```bash
curl -X POST http://localhost:3000/api/v1/materials/generate \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "material_type": "EXAMEN",
    "course_id": "uuid-algebra",
    "difficulty_level": "AVANZADO",
    "exam_areas": ["uuid_area_A", "uuid_area_B"]
  }'
```

### 3. Verificar Worker Logs & S3
Observa la terminal 2 (Worker). Debería aparecer:
```text
[INFO] Received SQS Event: 84a3-4b92-b6f7-112233445566
[INFO] Material type EXAMEN detected. Preparing booklets for areas: uuid_area_A, uuid_area_B
[INFO] Core API returned 5 questions
[INFO] PDF successfully generated and uploaded to s3://odiseo-materials/examen_firmado.pdf
[INFO] Firing WebSocket notification via API Gateway.
```

### 4. Validar WebSocket Event
Como administrador conectado a la interfaz web (o en consola de cliente Websocket), validarás que el evento `material.generation.completed` llegó con el `download_url` listo.

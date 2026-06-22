# Quickstart: Material Generation Pipeline

This guide outlines the steps to run and verify the `004-generacion-revision-materiales` module end-to-end.

## Environment Variables

### NestJS Backend (`backend-nestjs/.env`)
Make sure the following variables are configured:
```bash
# AWS SQS & S3 Configuration (LocalStack defaults)
AWS_REGION=us-east-1
AWS_SQS_QUEUE_URL=http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/odiseo-materials-queue
AWS_SQS_ENDPOINT=http://localhost:4566
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_BUCKET=odiseo-materials
```

### FastAPI Worker (`worker-fastapi/.env` or Docker Compose)
```bash
AWS_SQS_QUEUE_URL=http://localstack:4566/000000000000/odiseo-materials-queue
AWS_SQS_ENDPOINT=http://localstack:4566
AWS_S3_ENDPOINT=http://localstack:4566
AWS_S3_BUCKET_NAME=odiseo-materials
AWS_REGION=us-east-1
B2B_WEBHOOK_URL=http://host.docker.internal:3000/v1/materials/webhook/status
```

## Running the Services

### 1. Start LocalStack and Worker Containers
From the root directory of the repository:
```bash
docker-compose up --build -d
```
This builds and starts:
- **LocalStack**: Initializes SQS `odiseo-materials-queue` and S3 `odiseo-materials` bucket.
- **FastAPI Worker**: Automatically listens to the LocalStack queue in the background.

### 2. Start NestJS Backend
In `backend-nestjs`:
```bash
npm run start:dev
```

### 3. Start Frontend Vue App
In `frontend-vue`:
```bash
npm run dev
```

## Testing & Verification Scenarios

### Automated Tests
Run unit tests in both modules to ensure regression safety:

**NestJS Tests:**
```bash
cd backend-nestjs
npm run test src/materials/materials.service.spec.ts
```

**FastAPI Tests:**
```bash
cd worker-fastapi
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt pytest
pytest tests/
```

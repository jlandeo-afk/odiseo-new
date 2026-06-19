# Quickstart: Gestión de Sílabos Validation

## Prerequisites
- NestJS dev server active
- Valid `cycle_id` and `course_id`
- Valid `topic_id` and `subtopic_id` from the Core API.

## End-to-End Test Scenarios

### 1. Syllabus Creation
```bash
curl -X POST http://localhost:3000/api/v1/syllabus \
-H "Content-Type: application/json" \
-d '{"cycle_id": "CYCLE_UUID", "course_id": "COURSE_UUID"}'
```

### 2. Assignment & Constraint Check
Assigning questions below the limit:
```bash
curl -X POST http://localhost:3000/api/v1/syllabus/SYLLABUS_UUID/distribution \
-H "Content-Type: application/json" \
-d '{"week_number": 1, "topic_id": "TOPIC_UUID", "subtopic_id": "SUBTOPIC_UUID", "requested_quantity": 50}'
```
Attempting to exceed the 100 limit (should fail with 400):
```bash
curl -X POST http://localhost:3000/api/v1/syllabus/SYLLABUS_UUID/distribution \
-H "Content-Type: application/json" \
-d '{"week_number": 1, "topic_id": "TOPIC_UUID2", "subtopic_id": "SUBTOPIC_UUID2", "requested_quantity": 60}'
```

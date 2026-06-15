# Contract: API Generate Material

Contrato OpenAPI del endpoint RESTful expuesto por el SaaS B2B para que los clientes soliciten la generación de material.

**POST** `/api/v1/materials/generate`
**Auth**: Bearer Token (Admin Session)

## Request Body

```json
{
  "material_type": "EXAMEN", // Enum: BALOTARIO, EXAMEN, PRACTICA
  "course_id": "uuid",
  "difficulty_level": "AVANZADO",
  "exam_areas": ["uuid_area_A", "uuid_area_B"] // Opcional, solo obligatorio si material_type === EXAMEN
}
```

## Responses

### 202 Accepted
Indica que la validación pasó exitosamente, la carga del syllabus se extrajo de base de datos y la solicitud se despachó a SQS. El cliente no recibe un PDF aquí, solo un acuse de recibo.

```json
{
  "status": "processing",
  "job_id": "84a3-4b92-b6f7-112233445566",
  "message": "La solicitud ha sido encolada exitosamente. Recibirás una notificación cuando el material esté listo para descargar."
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation Error: exam_areas is required when material_type is EXAMEN",
  "error": "Bad Request"
}
```

# Data Model: Generación de Balotario PDF

## Entidad: SQS Payload (GenerateMaterialJob)

Estructura JSON exacta del mensaje que viaja por la cola Amazon SQS desde el SaaS B2B hacia el Worker asíncrono.

```json
{
  "job_id": "84a3-4b92-b6f7-112233445566",
  "tenant": {
    "tenant_id": "7b89-11c2-d344",
    "commercial_name": "Colegio Odiseo Innova",
    "logo_url": "https://s3.aws.com/tenant-assets/odiseo-innova.png"
  },
  "material_type": "EXAMEN",
  "course_id": "uuid_algebra",
  "difficulty_level": "AVANZADO",
  "exam_areas": [
    {
      "exam_area_id": "uuid_area_A",
      "name": "Área A (Medicina)"
    },
    {
      "exam_area_id": "uuid_area_B",
      "name": "Área B (Ingenierías)"
    }
  ],
  "syllabus_distribution": [
    {
      "topic_id": "uuid_ecuaciones",
      "subtopic_id": "uuid_lineales",
      "requested_quantity": 3
    },
    {
      "topic_id": "uuid_ecuaciones",
      "subtopic_id": "uuid_cuadraticas",
      "requested_quantity": 2
    }
  ],
  "notification": {
    "websocket_connection_id": "string",
    "admin_user_id": "uuid"
  }
}
```

### Justificación Arquitectónica:
- Se evita cross-query de base de datos desde el worker adjuntando los metadatos del tenant directamente en el payload (evita complejidad de acceso multi-tenant schema-per-tenant para un job efímero).
- Se envía el objeto `exam_areas` para cumplir la restricción crítica `CR-002` y `CR-003`, permitiendo al worker procesar las particiones lógicas necesarias por cuadernillo sin consultar reglas del negocio complejas del lado B2B.

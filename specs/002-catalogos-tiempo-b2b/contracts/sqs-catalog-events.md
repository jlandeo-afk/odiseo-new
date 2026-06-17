# Contract: SQS Catalog Sync Events

## Event: TopicCreated / TopicUpdated

**Queue**: `odiseo-catalog-sync`
**DLQ**: `odiseo-catalog-sync-dlq` (maxReceiveCount: 3)

### Message Body

```json
{
  "eventType": "TopicUpdated",
  "tenantId": "uuid-company-A",
  "data": {
    "topics": [
      {
        "id": "uuid-topic-1",
        "coreName": "Ecuaciones Diferenciales Actualizadas",
        "courseId": "uuid-course-1"
      }
    ]
  }
}
```

### Processing Logic

```sql
INSERT INTO topics (id, core_name, course_id, local_alias, is_active)
VALUES ($1, $2, $3, NULL, true)
ON CONFLICT (id) DO UPDATE SET
  core_name = EXCLUDED.core_name
-- local_alias and is_active are NOT touched
```

### Error Handling

- Message fails processing → SQS retries (up to 3 times)
- After 3 failures → message moves to DLQ
- DLQ messages can be reprocessed manually via admin tool

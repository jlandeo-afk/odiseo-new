# Quickstart: Catálogos y Tiempo Académico

## Prerequisites

- Spec 001 (Fundamentos) completada: auth funcional, multi-tenant operativo.
- LocalStack o AWS con SQS configurado.

## Validation Steps

### 1. Verificar catálogos sincronizados

```bash
# Listar la taxonomía del tenant
curl http://localhost:3000/api/v1/catalogs \
  -b cookies.txt
```

**Esperado**: JSON con courses > topics > subtopics del tenant.

### 2. Editar alias de un topic

```bash
curl -X PATCH http://localhost:3000/api/v1/catalogs/topics/uuid-topic-1 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"localAlias": "ED Ordinarias"}'
```

**Esperado**: Topic actualizado con `localAlias = "ED Ordinarias"`, `coreName` intacto.

### 3. Simular sincronización SQS

Enviar un mensaje manualmente a la cola (ver contrato: [sqs-catalog-events.md](./contracts/sqs-catalog-events.md)). Verificar que `core_name` se actualizó pero `local_alias` permaneció intacto.

### 4. Crear un ciclo académico

```bash
curl -X POST http://localhost:3000/api/v1/academic-time/cycles \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ciclo 2026-I",
    "year": 2026,
    "startDate": "2026-03-01",
    "totalWeeks": 16,
    "daysPerWeek": 5
  }'
```

**Esperado**: Ciclo creado con 16 semanas auto-generadas y `endDate` calculada.

### 5. Desactivar una semana (soft-delete)

```bash
curl -X PATCH http://localhost:3000/api/v1/academic-time/weeks/uuid-week-8 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

**Esperado**: Semana 8 con `isActive = false`, registro NO eliminado.

### 6. Intentar DELETE de semana (prohibido)

```bash
curl -X DELETE http://localhost:3000/api/v1/academic-time/weeks/uuid-week-8 \
  -b cookies.txt
```

**Esperado**: HTTP 405 Method Not Allowed.

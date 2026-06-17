# Contract: Catalog API

## GET /api/v1/catalogs

**Type**: Authenticated

Returns the full taxonomy hierarchy for the tenant.

### Response 200 OK

```json
{
  "courses": [
    {
      "id": "uuid-course-1",
      "name": "Álgebra",
      "isActive": true,
      "topics": [
        {
          "id": "uuid-topic-1",
          "coreName": "Ecuaciones Diferenciales",
          "localAlias": "ED",
          "displayName": "ED",
          "isActive": true,
          "subtopics": [
            {
              "id": "uuid-sub-1",
              "coreName": "Resolución Básica",
              "isActive": true
            }
          ]
        }
      ]
    }
  ]
}
```

## PATCH /api/v1/catalogs/topics/:id

**Type**: Authenticated (requires `edit_catalogs` permission)

Updates local alias and/or visibility of a topic.

### Request

```json
{
  "localAlias": "Ecuaciones Diferenciales Ordinarias",
  "isActive": false
}
```

Both fields are optional — only provided fields are updated.

### Response 200 OK

```json
{
  "id": "uuid-topic-1",
  "coreName": "Ecuaciones Diferenciales",
  "localAlias": "Ecuaciones Diferenciales Ordinarias",
  "isActive": false
}
```

### Notes

- Subtopics do NOT have a PATCH endpoint — they are read-only.
- Setting `localAlias` to `null` removes the alias (falls back to `coreName`).

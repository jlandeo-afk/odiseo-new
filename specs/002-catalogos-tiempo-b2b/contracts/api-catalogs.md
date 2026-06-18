# Contract: Catalog API

## GET /api/v1/catalogs

**Type**: Authenticated
**Permissions**: `view_catalogs`

Returns the full taxonomy hierarchy for the tenant, fetching data from the `public` schema and intersecting it with the tenant's `tenant_topic_visibility` to determine the `isActive` state.

### Response 200 OK

```json
{
  "courses": [
    {
      "id": "uuid-course-1",
      "name": "Álgebra",
      "topics": [
        {
          "id": "uuid-topic-1",
          "name": "Ecuaciones Diferenciales",
          "isActive": true,
          "subtopics": [
            {
              "id": "uuid-sub-1",
              "name": "Resolución Básica"
            }
          ]
        }
      ]
    }
  ]
}
```

## PATCH /api/v1/catalogs/topics/:id/visibility

**Type**: Authenticated
**Permissions**: `edit_catalogs`

Updates the local visibility of a topic for the current tenant. This creates or updates a record in the `tenant_topic_visibility` table.

### Request

```json
{
  "isActive": false
}
```

### Response 200 OK

```json
{
  "id": "uuid-topic-1",
  "name": "Ecuaciones Diferenciales",
  "isActive": false
}
```

### Notes

- Subtopics do NOT have a PATCH endpoint — they are read-only and inherit their parent's inactivity in the UI.
- Courses do NOT have a PATCH endpoint.
- Names cannot be edited via any endpoint.

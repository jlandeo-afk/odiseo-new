# Syllabus API Contract

## POST /syllabus
Creates a new syllabus.
**Request**:
`{ "cycle_id": "uuid", "course_id": "uuid" }`
**Response**: `201 Created` with syllabus entity.

## POST /syllabus/:id/distribution
Adds a week distribution.
**Request**:
`{ "week_number": integer, "topic_id": "uuid", "subtopic_id": "uuid", "requested_quantity": integer }`
**Response**: `201 Created`

## PATCH /syllabus/:id/distribution/:distId
Updates quantity.
**Request**: `{ "requested_quantity": integer }`

## GET /syllabus/:id/summary
Gets the matrix summary.
**Response**: Array of weekly topic aggregations.

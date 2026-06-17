# Tasks: Historial y Trazabilidad

**Input**: Design documents from `/specs/005-historial-trazabilidad/`
**Prerequisites**: Spec 004 (Generación y Revisión) must be completed.

## Phase 1: Foundational

- [ ] T001 Create TypeORM entity `MaterialQuestionUsage` in `backend-nestjs/src/materials/entities/material-question-usage.entity.ts`
- [ ] T002 Create migration with performance-critical composite index `idx_question_usage_exclusion(course_id, question_id, used_at DESC)`
- [ ] T003 Extend `IMaterialsRepository` with methods: `recordQuestionUsage`, `getExcludedQuestionIds`, `getUsageByMaterial`

## Phase 2: User Story 1 — Historial (P1)

- [ ] T004 [US1] Write unit test for `MaterialsUseCase.getHistory()` in `backend-nestjs/src/materials/materials.use-case.spec.ts` — test pagination, filters, expired URL regeneration
- [ ] T005 [US1] Implement `getHistory()`, `getQuestionsByMaterial()`, `regenerateUrl()` in `MaterialsUseCase`
- [ ] T006 [US1] Add history endpoints to `MaterialsController` per contract: GET history, GET questions, POST regenerate-url
- [ ] T007 [P] [US1] Build `MaterialHistory` component in `frontend-vue/src/features/materials/components/MaterialHistory.vue` — filterable table, expandable warnings, download links
- [ ] T008 [P] [US1] Build history page in `frontend-vue/src/pages/materials/history.vue`

## Phase 3: User Story 2 — Anti-Repetición (P1)

- [ ] T009 [US2] Write unit test for exclusion logic — test that recent question_ids are excluded, pool exhaustion triggers reset
- [ ] T010 [US2] Implement `recordQuestionUsage()` in repository — bulk insert after material generation
- [ ] T011 [US2] Implement `getExcludedQuestionIds()` in repository — query last 3 materials for same course (configurable window)
- [ ] T012 [US2] Update `MaterialsUseCase.generate()` (from spec 004) to include exclusion list in SQS payload
- [ ] T013 [US2] Implement pool exhaustion handling: reset tracking for exhausted subtopic, add warning to response

## Phase 4: User Story 3 — Consulta de Preguntas Usadas (P2)

- [ ] T014 [US3] Add expandable question detail to `MaterialHistory` component — show position, topic, replacement indicator
- [ ] T015 [US3] Write E2E test: generate material → verify usage recorded → generate again → verify exclusion

## Phase 5: Polish

- [ ] T016 Run all tests — backend + frontend
- [ ] T017 [P] Verify composite index performance with `EXPLAIN ANALYZE` on exclusion query

## Dependencies

```
Spec 004 Complete
  └── Phase 1 (T001-T003)
       ├── Phase 2 (US1: T004-T008) — History view
       └── Phase 3 (US2: T009-T013) — Anti-repetition
            └── Phase 4 (US3: T014-T015) — Detail view
                 └── Phase 5 (T016-T017) — Polish
```

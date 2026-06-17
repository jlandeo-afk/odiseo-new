# Tasks: Generación y Revisión de Materiales PDF

**Input**: Design documents from `/specs/004-generacion-revision-materiales/`
**Prerequisites**: Spec 003 (Sílabos) must be completed.

## Phase 1: Foundational

- [ ] T001 Create TypeORM entities `MaterialRequest` and `MaterialReviewQuestion` in `backend-nestjs/src/materials/entities/`
- [ ] T002 Create `IMaterialsRepository` interface and implementation in `backend-nestjs/src/materials/repositories/`
- [ ] T003 Create `MaterialsModule` in `backend-nestjs/src/materials/materials.module.ts`

## Phase 2: User Story 1 — Solicitud de Generación (P1)

- [ ] T004 [US1] Write unit test for `MaterialsUseCase.generate()` in `backend-nestjs/src/materials/materials.use-case.spec.ts` — test syllabus read, payload construction, SQS dispatch, missing distribution rejection (EC-004)
- [ ] T005 [US1] Implement `MaterialsUseCase` in `backend-nestjs/src/materials/materials.use-case.ts` — read syllabus distribution, build payload with tenant branding, persist MaterialRequest (PENDING), send to SQS, return jobId
- [ ] T006 [US1] Create DTOs and controller in `backend-nestjs/src/materials/` per contract
- [ ] T007 [P] [US1] Build `GenerateForm` component in `frontend-vue/src/features/materials/components/GenerateForm.vue` — select type, course, syllabus, week; toggle requires_review

## Phase 3: User Story 2 — Worker Processing (P1)

- [ ] T008 [US2] Fix indentation bug in `worker-fastapi/src/material_assembler.py` (if material_type EXAMEN block)
- [ ] T009 [US2] Refactor `MaterialAssembler` to accept real syllabus distribution instead of hardcoded data
- [ ] T010 [US2] Implement `PdfGenerator` using WeasyPrint in `worker-fastapi/src/pdf_generator.py` — HTML template with tenant branding, question rendering
- [ ] T011 [US2] Update `S3Uploader` in `worker-fastapi/src/s3_uploader.py` to generate presigned URLs
- [ ] T012 [US2] Update `WsNotifier` in `worker-fastapi/src/ws_notifier.py` for events: completed, failed, review_required
- [ ] T013 [US2] Write integration test for Worker: send SQS message → verify PDF on S3 → verify WebSocket notification

## Phase 4: User Story 3 — Revisión de Material (P1)

- [ ] T014 [US3] Write unit test for review flow in `MaterialsUseCase` — get review data, replace question, approve with warnings
- [ ] T015 [US3] Implement review endpoints: GET review data, POST approve per contract
- [ ] T016 [P] [US3] Build `MaterialReview` component in `frontend-vue/src/features/materials/components/MaterialReview.vue` — ordered question list, FOUND/EMPTY indicators, approve button, continue-with-warnings option
- [ ] T017 [P] [US3] Implement materials Pinia store with WebSocket listener for real-time status updates

## Phase 5: User Story 4 — WebSocket Notifications (P1)

- [ ] T018 [US4] Configure WebSocket connection in `frontend-vue/src/features/materials/store/index.ts` — listen for material events, show toast notifications
- [ ] T019 [P] [US4] Build `MaterialStatus` component — shows real-time status with download link when completed

## Phase 6: Pages & Polish

- [ ] T020 Build materials page in `frontend-vue/src/pages/materials/index.vue`
- [ ] T021 [P] Build review page in `frontend-vue/src/pages/materials/review.vue`
- [ ] T022 Run all tests — backend + worker + frontend

## Dependencies

```
Spec 003 Complete
  └── Phase 1 (T001-T003)
       ├── Phase 2 (US1: T004-T007) — Backend solicitation
       └── Phase 3 (US2: T008-T013) — Worker processing
            └── Phase 4 (US3: T014-T017) — Review flow
                 └── Phase 5 (US4: T018-T019) — WebSocket
                      └── Phase 6 (T020-T022) — Pages
```

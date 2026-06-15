/**
 * T036 [US4] — Frontend Unit Tests: Curation Store + Curation View
 *
 * Pruebas unitarias para el flujo interactivo de curaduría manual:
 * - Transiciones de estado en Pinia (MISSING → GENERATED → AUTO_COMPLETED | MANUAL_REMOVED)
 * - Llamadas API de curaduría
 * - Getters reactivos (isReadyToCompile, activeQuestions, etc.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCurationStore } from '@/stores/curation.store';
import { CurationQuestionStatus, type CurationQuestion } from '@/types/materials';

function createMockQuestions(): CurationQuestion[] {
  return [
    {
      questionId: 'q-1',
      jobId: 'job-100',
      content: '¿Cuál es la derivada de x²?',
      options: [
        { key: 'A', value: '2x' },
        { key: 'B', value: 'x' },
        { key: 'C', value: '2' },
      ],
      status: CurationQuestionStatus.GENERATED,
    },
    {
      questionId: 'q-2',
      jobId: 'job-100',
      content: '¿Cuál es la integral de 1/x?',
      options: [
        { key: 'A', value: 'ln(x)' },
        { key: 'B', value: 'x' },
      ],
      status: CurationQuestionStatus.MISSING,
    },
    {
      questionId: 'q-3',
      jobId: 'job-100',
      content: '¿Qué es un número primo?',
      options: [],
      status: CurationQuestionStatus.GENERATED,
    },
  ];
}

describe('Curation Store (Pinia)', () => {
  let store: ReturnType<typeof useCurationStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCurationStore();
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }),
    ));
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
    });
  });

  it('should initialize with empty state', () => {
    expect(store.jobId).toBeNull();
    expect(store.questions).toHaveLength(0);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should set job and initial questions', () => {
    const questions = createMockQuestions();
    store.setJob('job-100', questions);

    expect(store.jobId).toBe('job-100');
    expect(store.questions).toHaveLength(3);
  });

  it('should compute activeQuestions excluding MANUAL_REMOVED', () => {
    const questions = createMockQuestions();
    questions[1].status = CurationQuestionStatus.MANUAL_REMOVED;
    store.setJob('job-100', questions);

    expect(store.activeQuestions).toHaveLength(2);
    expect(store.removedQuestions).toHaveLength(1);
  });

  it('should compute generatedCount and missingCount correctly', () => {
    store.setJob('job-100', createMockQuestions());

    expect(store.generatedCount).toBe(2);
    expect(store.missingCount).toBe(1);
    expect(store.completedCount).toBe(0);
  });

  it('should return isReadyToCompile = false when MISSING questions exist', () => {
    store.setJob('job-100', createMockQuestions());
    expect(store.isReadyToCompile).toBe(false);
  });

  it('should return isReadyToCompile = true when all active are GENERATED or AUTO_COMPLETED', () => {
    const questions = createMockQuestions();
    questions[1].status = CurationQuestionStatus.AUTO_COMPLETED;
    store.setJob('job-100', questions);

    expect(store.isReadyToCompile).toBe(true);
  });

  it('should transition question to MANUAL_REMOVED on removeQuestion', async () => {
    store.setJob('job-100', createMockQuestions());

    await store.removeQuestion('q-1');

    const q = store.questions.find(q => q.questionId === 'q-1');
    expect(q?.status).toBe(CurationQuestionStatus.MANUAL_REMOVED);
    expect(store.removedQuestions).toHaveLength(1);
  });

  it('should call PUT endpoint on removeQuestion', async () => {
    store.setJob('job-100', createMockQuestions());
    await store.removeQuestion('q-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/materials/job-100/questions/q-1/remove'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('should transition MISSING questions to AUTO_COMPLETED on autoComplete', async () => {
    store.setJob('job-100', createMockQuestions());

    await store.autoComplete();

    const q2 = store.questions.find(q => q.questionId === 'q-2');
    expect(q2?.status).toBe(CurationQuestionStatus.AUTO_COMPLETED);
    // Already GENERATED should remain GENERATED
    const q1 = store.questions.find(q => q.questionId === 'q-1');
    expect(q1?.status).toBe(CurationQuestionStatus.GENERATED);
  });

  it('should call PUT endpoint on regenerateQuestion', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          question: { question_id: 'q-new', content: 'Nueva pregunta regenerada' },
        }),
      }),
    ));

    store.setJob('job-100', createMockQuestions());
    await store.regenerateQuestion('q-2');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/materials/job-100/questions/q-2/regenerate'),
      expect.objectContaining({ method: 'PUT' }),
    );

    const updated = store.questions.find(q => q.questionId === 'q-2' || q.questionId === 'q-new');
    expect(updated?.content).toBe('Nueva pregunta regenerada');
    expect(updated?.status).toBe(CurationQuestionStatus.GENERATED);
  });

  it('should set error on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ));

    store.setJob('job-100', createMockQuestions());
    await store.removeQuestion('q-1');

    expect(store.error).toContain('Error al remover pregunta');
  });

  it('should reset all state', () => {
    store.setJob('job-100', createMockQuestions());
    store.reset();

    expect(store.jobId).toBeNull();
    expect(store.questions).toHaveLength(0);
    expect(store.error).toBeNull();
  });
});

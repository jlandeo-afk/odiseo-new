/**
 * T035 [US4] — Curation Store (Pinia)
 *
 * Gestiona el estado reactivo de la curaduría manual.
 * Soporta las transiciones de estado en tiempo real:
 *   MISSING → GENERATED → AUTO_COMPLETED | MANUAL_REMOVED
 *
 * Interactúa con los endpoints REST de curaduría del backend B2B NestJS
 * y se sincroniza con el WebSocket store para actualizaciones en tiempo real.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { CurationQuestionStatus, type CurationQuestion } from '@/types/materials';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function apiPut(path: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
}

export const useCurationStore = defineStore('curation', () => {
  // --- State ---
  const jobId = ref<string | null>(null);
  const questions = ref<CurationQuestion[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const activeQuestions = computed(() =>
    questions.value.filter(q => q.status !== CurationQuestionStatus.MANUAL_REMOVED),
  );

  const removedQuestions = computed(() =>
    questions.value.filter(q => q.status === CurationQuestionStatus.MANUAL_REMOVED),
  );

  const generatedCount = computed(() =>
    questions.value.filter(q => q.status === CurationQuestionStatus.GENERATED).length,
  );

  const completedCount = computed(() =>
    questions.value.filter(q => q.status === CurationQuestionStatus.AUTO_COMPLETED).length,
  );

  const missingCount = computed(() =>
    questions.value.filter(q => q.status === CurationQuestionStatus.MISSING).length,
  );

  const isReadyToCompile = computed(() =>
    activeQuestions.value.length > 0
    && activeQuestions.value.every(
      q =>
        q.status === CurationQuestionStatus.GENERATED
        || q.status === CurationQuestionStatus.AUTO_COMPLETED,
    ),
  );

  // --- Actions ---

  function setJob(id: string, initialQuestions: CurationQuestion[]): void {
    jobId.value = id;
    questions.value = initialQuestions;
    error.value = null;
  }

  /**
   * Remueve una pregunta individual (CR-005: función PostgreSQL retorna void).
   */
  async function removeQuestion(questionId: string): Promise<void> {
    if (!jobId.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const res = await apiPut(`/v1/materials/${jobId.value}/questions/${questionId}/remove`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Actualizar estado local reactivamente
      const idx = questions.value.findIndex(q => q.questionId === questionId);
      if (idx !== -1) {
        questions.value[idx].status = CurationQuestionStatus.MANUAL_REMOVED;
      }
    } catch (err: any) {
      error.value = `Error al remover pregunta: ${err.message}`;
      console.error('[Curation] removeQuestion failed:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Regenera una pregunta individual, reemplazándola con la respuesta del backend.
   */
  async function regenerateQuestion(questionId: string): Promise<void> {
    if (!jobId.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const res = await apiPut(`/v1/materials/${jobId.value}/questions/${questionId}/regenerate`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { question: newQuestion } = await res.json();
      // Reemplazar la pregunta en el store con la nueva generada
      const idx = questions.value.findIndex(q => q.questionId === questionId);
      if (idx !== -1) {
        questions.value[idx] = {
          ...questions.value[idx],
          questionId: newQuestion.question_id || questionId,
          content: newQuestion.content,
          status: CurationQuestionStatus.GENERATED,
        };
      }
    } catch (err: any) {
      error.value = `Error al regenerar pregunta: ${err.message}`;
      console.error('[Curation] regenerateQuestion failed:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Confirma la curaduría manual y dispara la generación física del PDF.
   */
  async function manualComplete(): Promise<void> {
    if (!jobId.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const res = await apiPut(`/v1/materials/${jobId.value}/complete`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      error.value = `Error al completar curaduría: ${err.message}`;
      console.error('[Curation] manualComplete failed:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Ejecuta autocompletado: todas las preguntas MISSING pasan a AUTO_COMPLETED.
   */
  async function autoComplete(): Promise<void> {
    if (!jobId.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const res = await apiPut(`/v1/materials/${jobId.value}/autocomplete`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Actualizar estado local: MISSING → AUTO_COMPLETED
      questions.value.forEach(q => {
        if (q.status === CurationQuestionStatus.MISSING) {
          q.status = CurationQuestionStatus.AUTO_COMPLETED;
        }
      });
    } catch (err: any) {
      error.value = `Error al autocompletar: ${err.message}`;
      console.error('[Curation] autoComplete failed:', err);
    } finally {
      isLoading.value = false;
    }
  }

  function reset(): void {
    jobId.value = null;
    questions.value = [];
    isLoading.value = false;
    error.value = null;
  }

  return {
    // State
    jobId,
    questions,
    isLoading,
    error,
    // Getters
    activeQuestions,
    removedQuestions,
    generatedCount,
    completedCount,
    missingCount,
    isReadyToCompile,
    // Actions
    setJob,
    removeQuestion,
    regenerateQuestion,
    manualComplete,
    autoComplete,
    reset,
  };
});

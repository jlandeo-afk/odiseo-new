<!--
  T034 [US4] — Curation View
  Vista intermedia de curaduría manual. Permite al administrador B2B
  visualizar, remover, regenerar y aprobar preguntas antes de
  compilar el PDF final. Consume el store curation.store.ts (Pinia).
-->
<template>
  <div class="curation-view">
    <header class="curation-view__header">
      <div>
        <h1>Curaduría Manual</h1>
        <p class="curation-view__subtitle">
          Revisa las preguntas seleccionadas antes de generar el PDF final.
        </p>
      </div>
      <div class="curation-view__stats">
        <span class="stat stat--generated">{{ store.generatedCount }} generadas</span>
        <span class="stat stat--completed">{{ store.completedCount }} completadas</span>
        <span class="stat stat--missing">{{ store.missingCount }} pendientes</span>
        <span class="stat stat--removed">{{ store.removedQuestions.length }} removidas</span>
      </div>
    </header>

    <!-- Error banner -->
    <div v-if="store.error" class="curation-view__error" role="alert">
      {{ store.error }}
    </div>

    <!-- Action bar -->
    <div class="curation-view__actions">
      <button
        class="btn btn--auto"
        :disabled="store.isLoading || store.missingCount === 0"
        @click="store.autoComplete()"
      >
        ⚡ Autocompletar pendientes
      </button>
      <button
        class="btn btn--confirm"
        :disabled="store.isLoading || !store.isReadyToCompile"
        @click="handleManualComplete"
      >
        ✅ Confirmar y generar PDF
      </button>
    </div>

    <!-- Loading overlay -->
    <div v-if="store.isLoading" class="curation-view__loading">
      <div class="spinner" />
      Procesando...
    </div>

    <!-- Question list -->
    <TransitionGroup name="question-list" tag="div" class="curation-view__questions">
      <div
        v-for="question in store.activeQuestions"
        :key="question.questionId"
        class="question-card"
        :class="`question-card--${question.status.toLowerCase()}`"
      >
        <div class="question-card__status-badge">
          {{ statusLabel(question.status) }}
        </div>

        <div class="question-card__content">
          <p class="question-card__text">{{ question.content }}</p>
          <ul v-if="question.options?.length" class="question-card__options">
            <li v-for="opt in question.options" :key="opt.key">
              <strong>{{ opt.key }})</strong> {{ opt.value }}
            </li>
          </ul>
        </div>

        <div class="question-card__actions">
          <button
            class="btn-icon btn-icon--regenerate"
            title="Regenerar pregunta"
            :disabled="store.isLoading"
            @click="store.regenerateQuestion(question.questionId)"
          >
            🔄
          </button>
          <button
            class="btn-icon btn-icon--remove"
            title="Remover pregunta"
            :disabled="store.isLoading"
            @click="store.removeQuestion(question.questionId)"
          >
            🗑️
          </button>
        </div>
      </div>
    </TransitionGroup>

    <!-- Removed questions (collapsed) -->
    <details v-if="store.removedQuestions.length > 0" class="curation-view__removed">
      <summary>
        Ver {{ store.removedQuestions.length }} pregunta(s) removida(s)
      </summary>
      <div
        v-for="q in store.removedQuestions"
        :key="q.questionId"
        class="question-card question-card--manual_removed question-card--dimmed"
      >
        <div class="question-card__status-badge">Removida</div>
        <div class="question-card__content">
          <p class="question-card__text">{{ q.content }}</p>
        </div>
      </div>
    </details>

    <!-- Confirm modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
        <div class="modal">
          <h2>¿Confirmar generación del PDF?</h2>
          <p>
            Se compilarán <strong>{{ store.activeQuestions.length }}</strong> preguntas
            en el documento final. Esta acción no se puede deshacer.
          </p>
          <div class="modal__actions">
            <button class="btn btn--cancel" @click="showConfirmModal = false">Cancelar</button>
            <button class="btn btn--confirm" @click="confirmGeneration">Confirmar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCurationStore } from '@/stores/curation.store';
import { CurationQuestionStatus } from '@/types/materials';

const store = useCurationStore();
const showConfirmModal = ref(false);

function statusLabel(status: CurationQuestionStatus): string {
  const labels: Record<CurationQuestionStatus, string> = {
    [CurationQuestionStatus.MISSING]: 'Pendiente',
    [CurationQuestionStatus.GENERATED]: 'Generada',
    [CurationQuestionStatus.AUTO_COMPLETED]: 'Auto-completada',
    [CurationQuestionStatus.MANUAL_REMOVED]: 'Removida',
  };
  return labels[status];
}

function handleManualComplete(): void {
  showConfirmModal.value = true;
}

async function confirmGeneration(): Promise<void> {
  showConfirmModal.value = false;
  await store.manualComplete();
}
</script>

<style scoped>
.curation-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
}

.curation-view__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.curation-view__header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.curation-view__subtitle {
  color: #6c757d;
  font-size: 0.95rem;
  margin: 4px 0 0;
}

.curation-view__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}
.stat--generated { background: #e8f5e9; color: #2e7d32; }
.stat--completed { background: #e3f2fd; color: #1565c0; }
.stat--missing { background: #fff3e0; color: #e65100; }
.stat--removed { background: #fce4ec; color: #c62828; }

.curation-view__error {
  background: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.curation-view__actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--auto {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: #fff;
}
.btn--auto:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
}

.btn--confirm {
  background: linear-gradient(135deg, #66bb6a, #388e3c);
  color: #fff;
}
.btn--confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(56, 142, 60, 0.3);
}

.btn--cancel {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.curation-view__loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #6c757d;
  margin-bottom: 16px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e0e0e0;
  border-top-color: #1e88e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.curation-view__questions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.question-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e8eaf0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}
.question-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.question-card--generated { border-left: 4px solid #4caf50; }
.question-card--auto_completed { border-left: 4px solid #2196f3; }
.question-card--missing { border-left: 4px solid #ff9800; }
.question-card--manual_removed { border-left: 4px solid #ef5350; }
.question-card--dimmed { opacity: 0.55; }

.question-card__status-badge {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
  min-width: 90px;
  margin-top: 3px;
}

.question-card__content {
  flex: 1;
}

.question-card__text {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #333;
  line-height: 1.5;
}

.question-card__options {
  list-style: none;
  padding: 0;
  margin: 0;
}
.question-card__options li {
  font-size: 0.88rem;
  color: #555;
  padding: 3px 0;
}

.question-card__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-icon:hover:not(:disabled) {
  transform: scale(1.1);
}
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-icon--regenerate:hover:not(:disabled) { background: #e3f2fd; border-color: #90caf9; }
.btn-icon--remove:hover:not(:disabled) { background: #ffebee; border-color: #ef9a9a; }

.curation-view__removed {
  margin-top: 24px;
  cursor: pointer;
}
.curation-view__removed summary {
  color: #9e9e9e;
  font-size: 0.88rem;
  font-weight: 500;
  margin-bottom: 12px;
}

/* --- Transition Group --- */
.question-list-enter-active,
.question-list-leave-active {
  transition: all 0.3s ease;
}
.question-list-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.question-list-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

/* --- Confirm Modal --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
.modal {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  max-width: 440px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}
.modal h2 {
  margin: 0 0 12px;
  font-size: 1.2rem;
  color: #1a1a2e;
}
.modal p {
  margin: 0 0 24px;
  color: #555;
  line-height: 1.5;
}
.modal__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>

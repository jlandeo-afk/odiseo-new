<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Generar Material
          </h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isOpen = false" />
        </div>
      </template>

      <div class="space-y-4">
        <!-- Week Selection -->
        <UFormGroup label="Semana Objetivo" name="weekNumber">
          <UInput type="number" v-model.number="form.weekNumber" min="1" placeholder="Ej: 5" />
        </UFormGroup>

        <!-- Course Selection (Mocked for MVP) -->
        <UFormGroup label="Cursos" name="courses">
          <USelectMenu v-model="form.selectedCourse" :options="['math-101', 'sci-202']" placeholder="Seleccione un curso" />
        </UFormGroup>

        <!-- Requires Review -->
        <UFormGroup label="Opciones" name="requiresReview">
          <UCheckbox v-model="form.requiresReview" label="Requiere revisión manual antes de PDF" />
        </UFormGroup>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <UButton color="white" @click="isOpen = false">Cancelar</UButton>
          <UButton color="primary" :loading="isSubmitting" @click="submit">Generar</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const isOpen = defineModel<boolean>()
const emit = defineEmits(['generated'])

const form = reactive({
  weekNumber: 1,
  selectedCourse: 'math-101',
  requiresReview: true
})

const isSubmitting = ref(false)

async function submit() {
  isSubmitting.value = true
  try {
    const payload = {
      profile_id: '123e4567-e89b-12d3-a456-426614174000', // Mock UUID para el perfil
      week_number: form.weekNumber,
      requires_review: form.requiresReview,
      courses: [{ course_id: form.selectedCourse }]
    }

    const response = await $fetch('/api/v1/materials/generate', {
      method: 'POST',
      body: payload
    })

    emit('generated', response)
    isOpen.value = false
  } catch (err) {
    console.error('Error generating material:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

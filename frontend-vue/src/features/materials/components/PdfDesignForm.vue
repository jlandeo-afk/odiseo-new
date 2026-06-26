<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePdfDesignsStore, type PdfDesignTemplate } from '../store/pdfDesigns'

const props = defineProps<{
  designId?: string
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const store = usePdfDesignsStore()
const isEditing = ref(false)
const submitting = ref(false)
const logoFile = ref<File | null>(null)
const bgFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const bgPreview = ref<string | null>(null)

const form = ref({
  name: '',
  primaryColor: '#6366f1',
  fontFamily: 'Arial, sans-serif',
  headerText: '',
  footerText: 'Página {page} de {total}',
  showCover: true,
  showPagination: true,
  showFrame: true,
  contactInfo: '',
  isDefault: false,
})

onMounted(async () => {
  if (props.designId) {
    isEditing.value = true
    const design = await store.fetchDesign(props.designId)
    if (design) {
      form.value.name = design.name
      form.value.primaryColor = design.primaryColor || '#6366f1'
      form.value.fontFamily = design.fontFamily || 'Arial, sans-serif'
      form.value.headerText = design.headerText || ''
      form.value.footerText = design.footerText || 'Página {page} de {total}'
      form.value.showCover = design.showCover
      form.value.showPagination = design.showPagination
      form.value.showFrame = design.showFrame
      form.value.contactInfo = design.contactInfo || ''
      form.value.isDefault = design.isDefault
      logoPreview.value = design.logoUrl
      bgPreview.value = design.backgroundUrl
    }
  }
})

function onLogoChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    logoFile.value = input.files[0]
    logoPreview.value = URL.createObjectURL(input.files[0])
  }
}

function onBgChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    bgFile.value = input.files[0]
    bgPreview.value = URL.createObjectURL(input.files[0])
  }
}

async function removeLogo() {
  if (props.designId) {
    await store.deleteAsset(props.designId, 'logo')
  }
  logoPreview.value = null
  logoFile.value = null
}

async function removeBg() {
  if (props.designId) {
    await store.deleteAsset(props.designId, 'background')
  }
  bgPreview.value = null
  bgFile.value = null
}

async function handleSubmit() {
  submitting.value = true
  try {
    if (isEditing.value && props.designId) {
      await store.updateDesign(props.designId, form.value)
      if (logoFile.value) await store.uploadLogo(props.designId, logoFile.value)
      if (bgFile.value) await store.uploadBackground(props.designId, bgFile.value)
    } else {
      const created = await store.createDesign(form.value)
      if (logoFile.value && created) await store.uploadLogo(created.id, logoFile.value)
      if (bgFile.value && created) await store.uploadBackground(created.id, bgFile.value)
    }
    emit('saved')
  } catch {
    // handled by store
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Name -->
      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nombre</label>
        <UInput v-model="form.name" placeholder="Mi diseño" required />
      </div>

      <!-- Default -->
      <div class="flex items-end pb-1">
        <UCheckbox v-model="form.isDefault" label="Plantilla por defecto" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Primary Color -->
      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Color primario</label>
        <div class="flex gap-2 items-center">
          <input type="color" v-model="form.primaryColor"
            class="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer" />
          <UInput v-model="form.primaryColor" class="flex-1" placeholder="#6366f1" />
        </div>
      </div>

      <!-- Font -->
      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tipografía</label>
        <USelectMenu v-model="form.fontFamily" :items="[
          { value: 'Arial, sans-serif', label: 'Arial' },
          { value: 'Times New Roman, serif', label: 'Times New Roman' },
          { value: 'Helvetica, sans-serif', label: 'Helvetica' },
          { value: 'Georgia, serif', label: 'Georgia' },
          { value: 'Verdana, sans-serif', label: 'Verdana' },
        ]" value-key="value" label-key="label" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Header Text -->
      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
          Texto de encabezado
          <span class="text-[9px] text-slate-400 font-normal ml-1">{course_name}, {week_number}, {template_name}</span>
        </label>
        <UInput v-model="form.headerText" placeholder="Universidad - {course_name}" />
      </div>

      <!-- Footer Text -->
      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
          Texto de pie de página
          <span class="text-[9px] text-slate-400 font-normal ml-1">{page}, {total}</span>
        </label>
        <UInput v-model="form.footerText" placeholder="Página {page} de {total}" />
      </div>
    </div>

    <!-- Contact Info -->
    <div>
      <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Información de contacto</label>
      <UTextarea v-model="form.contactInfo" placeholder="info@institucion.edu.ec | Tel: 123456789" :rows="2" />
    </div>

    <!-- Toggles -->
    <div class="grid grid-cols-3 gap-4">
      <UCheckbox v-model="form.showCover" label="Mostrar portada" />
      <UCheckbox v-model="form.showPagination" label="Numeración de páginas" />
      <UCheckbox v-model="form.showFrame" label="Bordes / marco" />
    </div>

    <!-- Logo Upload -->
    <div>
      <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Logo institucional</label>
      <div class="flex items-center gap-3">
        <UButton color="gray" variant="outline" size="sm"
          @click="$refs.logoInput?.click()">
          <UIcon name="i-heroicons-cloud-arrow-up" class="w-4 h-4 mr-1" />
          {{ logoPreview ? 'Cambiar' : 'Subir' }}
        </UButton>
        <input ref="logoInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="onLogoChange" />
        <UButton v-if="logoPreview" color="red" variant="ghost" size="xs" icon="i-heroicons-trash"
          @click="removeLogo" />
        <span v-if="logoPreview" class="text-xs text-slate-500">Logo cargado</span>
      </div>
    </div>

    <!-- Background Upload -->
    <div>
      <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Fondo de portada</label>
      <div class="flex items-center gap-3">
        <UButton color="gray" variant="outline" size="sm"
          @click="$refs.bgInput?.click()">
          <UIcon name="i-heroicons-cloud-arrow-up" class="w-4 h-4 mr-1" />
          {{ bgPreview ? 'Cambiar' : 'Subir' }}
        </UButton>
        <input ref="bgInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="onBgChange" />
        <UButton v-if="bgPreview" color="red" variant="ghost" size="xs" icon="i-heroicons-trash"
          @click="removeBg" />
        <span v-if="bgPreview" class="text-xs text-slate-500">Fondo cargado</span>
      </div>
    </div>

    <!-- Submit -->
    <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
      <UButton color="gray" variant="ghost" @click="emit('cancelled')">Cancelar</UButton>
      <UButton type="submit" color="indigo" :loading="submitting">
        {{ isEditing ? 'Guardar cambios' : 'Crear diseño' }}
      </UButton>
    </div>
  </form>
</template>

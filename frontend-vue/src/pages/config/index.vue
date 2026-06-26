<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from '#imports'
import { usePdfDesignsStore } from '@/features/materials/store/pdfDesigns'
import { usePdfPreviewHtml } from '@/features/materials/composables/usePdfPreviewHtml'
import PdfDesignList from '@/features/materials/components/PdfDesignList.vue'

definePageMeta({ layout: 'b2b', permissions: ['generate_material'] })

const store = usePdfDesignsStore()
const toast = useToast()
const { buildPreviewHtml } = usePdfPreviewHtml()

type View = 'list' | 'editor'
const currentView = ref<View>('list')
const editingId = ref<string | null>(null)
const saving = ref(false)

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
  logoUrl: null as string | null,
  backgroundUrl: null as string | null,
})

const previewHtml = ref('')
const previewKey = ref(0)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const hasChanges = computed(() => {
  if (!editingId.value) return true
  return true
})

function schedulePreview() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    previewHtml.value = buildPreviewHtml({
      logoUrl: form.value.logoUrl,
      primaryColor: form.value.primaryColor,
      fontFamily: form.value.fontFamily,
      headerText: form.value.headerText,
      footerText: form.value.footerText,
      showCover: form.value.showCover,
      showPagination: form.value.showPagination,
      showFrame: form.value.showFrame,
      contactInfo: form.value.contactInfo,
    })
    previewKey.value++
  }, 150)
}

watch(form, schedulePreview, { deep: true, immediate: false })

function openNew() {
  editingId.value = null
  form.value = {
    name: '', primaryColor: '#6366f1', fontFamily: 'Arial, sans-serif',
    headerText: '', footerText: 'Página {page} de {total}',
    showCover: true, showPagination: true, showFrame: true,
    contactInfo: '', isDefault: false,
    logoUrl: null, backgroundUrl: null,
  }
  currentView.value = 'editor'
  schedulePreview()
}

async function openEdit(id: string) {
  editingId.value = id
  await store.fetchDesign(id)
  const d = store.currentDesign
  if (d) {
    form.value = {
      name: d.name, primaryColor: d.primaryColor || '#6366f1',
      fontFamily: d.fontFamily || 'Arial, sans-serif',
      headerText: d.headerText || '', footerText: d.footerText || 'Página {page} de {total}',
      showCover: d.showCover, showPagination: d.showPagination, showFrame: d.showFrame,
      contactInfo: d.contactInfo || '', isDefault: d.isDefault,
      logoUrl: d.logoUrl, backgroundUrl: d.backgroundUrl,
    }
  }
  currentView.value = 'editor'
  schedulePreview()
}

function goBack() {
  currentView.value = 'list'
  editingId.value = null
}

async function handleSave() {
  saving.value = true
  try {
    if (editingId.value) {
      await store.updateDesign(editingId.value, {
        name: form.value.name, primaryColor: form.value.primaryColor,
        fontFamily: form.value.fontFamily, headerText: form.value.headerText,
        footerText: form.value.footerText, showCover: form.value.showCover,
        showPagination: form.value.showPagination, showFrame: form.value.showFrame,
        contactInfo: form.value.contactInfo, isDefault: form.value.isDefault,
      })
      toast.add({ title: 'Plantilla actualizada', color: 'success', timeout: 2000 })
    } else {
      const created = await store.createDesign({
        name: form.value.name, primaryColor: form.value.primaryColor,
        fontFamily: form.value.fontFamily, headerText: form.value.headerText,
        footerText: form.value.footerText, showCover: form.value.showCover,
        showPagination: form.value.showPagination, showFrame: form.value.showFrame,
        contactInfo: form.value.contactInfo, isDefault: form.value.isDefault,
      })
      editingId.value = created.id
      toast.add({ title: 'Plantilla creada', color: 'success', timeout: 2000 })
    }
    await store.fetchDesigns()
  } catch {
    toast.add({ title: 'Error al guardar', color: 'red', timeout: 3000 })
  } finally {
    saving.value = false
  }
}

const colorPresets = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6',
]

const fontOptions = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
]

let logoInput: HTMLInputElement
let bgInput: HTMLInputElement

async function onLogoChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !editingId.value) return
  try {
    const url = await store.uploadLogo(editingId.value, file)
    form.value.logoUrl = url
  } catch { toast.add({ title: 'Error al subir logo', color: 'red', timeout: 3000 }) }
}

async function onBgChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !editingId.value) return
  try {
    const url = await store.uploadBackground(editingId.value, file)
    form.value.backgroundUrl = url
  } catch { toast.add({ title: 'Error al subir fondo', color: 'red', timeout: 3000 }) }
}

async function removeLogo() {
  if (!editingId.value) return
  await store.deleteAsset(editingId.value, 'logo')
  form.value.logoUrl = null
}

async function removeBg() {
  if (!editingId.value) return
  await store.deleteAsset(editingId.value, 'background')
  form.value.backgroundUrl = null
}
</script>

<template>
  <div class="h-screen flex flex-col bg-white dark:bg-[#0f1117]">
    <!-- List View -->
    <template v-if="currentView === 'list'">
      <div class="px-8 pt-6 pb-4 border-b border-slate-200 dark:border-white/5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
              <UIcon name="i-heroicons-paint-brush" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Plantillas de Diseño PDF</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Personaliza la apariencia de los PDFs generados</p>
            </div>
          </div>
          <UButton color="indigo" size="md" icon="i-heroicons-plus" @click="openNew">
            Nueva plantilla
          </UButton>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-8 py-6">
        <PdfDesignList @create="openNew" @edit="openEdit" />
      </div>
    </template>

    <!-- Editor View -->
    <template v-else>
      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#11131a] shrink-0">
        <div class="flex items-center gap-3">
          <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" @click="goBack" size="sm" />
          <span class="text-sm font-bold text-slate-700 dark:text-slate-300">
            {{ editingId ? 'Editar plantilla' : 'Nueva plantilla' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UCheckbox v-model="form.isDefault" label="Por defecto" />
          <UButton color="indigo" :loading="saving" @click="handleSave" size="sm">
            {{ editingId ? 'Guardar cambios' : 'Crear plantilla' }}
          </UButton>
        </div>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <!-- Form Panel -->
        <div class="w-[420px] shrink-0 overflow-y-auto border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1117] p-6 space-y-5">
          <!-- Name -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nombre</label>
            <UInput v-model="form.name" placeholder="Mi diseño" class="w-full" size="lg" />
          </div>

          <!-- Color -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Color primario</label>
            <div class="flex gap-2 items-center mb-2">
              <input type="color" v-model="form.primaryColor"
                class="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer shrink-0" />
              <UInput v-model="form.primaryColor" class="flex-1" placeholder="#6366f1" size="lg" />
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="c in colorPresets" :key="c"
                @click="form.primaryColor = c"
                class="w-6 h-6 rounded-lg border-2 transition-all duration-150"
                :class="form.primaryColor === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'"
                :style="{ background: c }" />
            </div>
          </div>

          <!-- Font -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tipografía</label>
            <USelectMenu v-model="form.fontFamily" :items="fontOptions" value-key="value" label-key="label" size="lg">
              <template #label>
                <span :style="{ fontFamily: form.fontFamily }">{{ fontOptions.find(f => f.value === form.fontFamily)?.label || 'Seleccionar' }}</span>
              </template>
              <template #option="{ option }">
                <span :style="{ fontFamily: option.value }">{{ option.label }}</span>
              </template>
            </USelectMenu>
          </div>

          <!-- Header -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Encabezado
              <span class="font-normal text-[9px] lowercase text-slate-400 ml-1">{course_name} {week_number} {template_name}</span>
            </label>
            <UInput v-model="form.headerText" placeholder="Universidad — {course_name}" size="lg" />
          </div>

          <!-- Footer -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Pie de página
              <span class="font-normal text-[9px] lowercase text-slate-400 ml-1">{page} {total}</span>
            </label>
            <UInput v-model="form.footerText" placeholder="Página {page} de {total}" size="lg" />
          </div>

          <!-- Contact -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Contacto</label>
            <UTextarea v-model="form.contactInfo" placeholder="info@institución.edu.ec" :rows="2" />
          </div>

          <!-- Toggles -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Secciones</label>
            <div class="space-y-2.5">
              <div class="flex items-center justify-between py-2 px-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Mostrar portada</span>
                <UToggle v-model="form.showCover" />
              </div>
              <div class="flex items-center justify-between py-2 px-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Numeración de páginas</span>
                <UToggle v-model="form.showPagination" />
              </div>
              <div class="flex items-center justify-between py-2 px-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Bordes / marco</span>
                <UToggle v-model="form.showFrame" />
              </div>
            </div>
          </div>

          <!-- Logo -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Logo institucional</label>
            <div class="flex items-center gap-3">
              <UButton color="gray" variant="outline" size="sm" @click="logoInput?.click()" class="shrink-0">
                <UIcon name="i-heroicons-photo" class="w-4 h-4 mr-1" />
                {{ form.logoUrl ? 'Cambiar' : 'Subir' }}
              </UButton>
              <input ref="logoInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="onLogoChange" />
              <UButton v-if="form.logoUrl" color="red" variant="ghost" size="xs" icon="i-heroicons-trash" @click="removeLogo" />
              <span v-if="form.logoUrl" class="text-xs text-emerald-600 dark:text-emerald-400">✓ Logo cargado</span>
            </div>
          </div>

          <!-- Background -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Fondo de portada</label>
            <div class="flex items-center gap-3">
              <UButton color="gray" variant="outline" size="sm" @click="bgInput?.click()" class="shrink-0">
                <UIcon name="i-heroicons-photo" class="w-4 h-4 mr-1" />
                {{ form.backgroundUrl ? 'Cambiar' : 'Subir' }}
              </UButton>
              <input ref="bgInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="onBgChange" />
              <UButton v-if="form.backgroundUrl" color="red" variant="ghost" size="xs" icon="i-heroicons-trash" @click="removeBg" />
              <span v-if="form.backgroundUrl" class="text-xs text-emerald-600 dark:text-emerald-400">✓ Fondo cargado</span>
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="flex-1 bg-slate-100 dark:bg-[#0a0c12] flex items-start justify-center overflow-y-auto p-6">
          <div class="w-full max-w-[600px]">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vista previa en vivo</span>
              <span class="text-[9px] text-slate-400">Actualización automática</span>
            </div>
            <div class="bg-white dark:bg-white/5 rounded-2xl shadow-lg border border-slate-200 dark:border-white/5 overflow-hidden">
              <iframe :key="previewKey" :srcdoc="previewHtml" sandbox="allow-same-origin"
                class="w-full h-[calc(100vh-200px)]" title="Preview" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

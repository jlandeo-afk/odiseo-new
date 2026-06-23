<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSyllabusStore } from '../../features/syllabus/store';
import { useAcademicTimeStore } from '../../features/academic-time/store';
import { useCatalogsStore } from '../../features/catalogs/store';
import SyllabusSlideOver from '../../features/syllabus/components/SyllabusSlideOver.vue';
import SyllabusDistributionMatrix from '../../features/syllabus/components/SyllabusDistributionMatrix.vue';
import { useToast } from '#imports';

definePageMeta({
  layout: 'b2b',
  permissions: ['view_syllabus'],
});

const store = useSyllabusStore();
const timeStore = useAcademicTimeStore();
const catalogsStore = useCatalogsStore();
const toast = useToast();

const slideOverRef = ref<any>();
const selectedCycleId = ref<string>('');
const searchQuery = ref('');

onMounted(async () => {
  await Promise.all([
    timeStore.fetchCycles(),
    catalogsStore.fetchCourses(),
  ]);

  if (timeStore.cycles.length > 0) {
    const activeCycle = timeStore.cycles.find(c => c.isActive) ?? timeStore.cycles[0];
    selectedCycleId.value = activeCycle.id;
  }
  
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

watch(selectedCycleId, async (newCycleId) => {
  if (newCycleId) {
    store.syllabus = null;
    await store.fetchSyllabiByCycle(newCycleId);
  }
});

// Atajo de teclado global (⌘K o /) para enfocar el buscador
function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k') || (e.key === '/')) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
    const input = document.getElementById('syllabus-search-input');
    if (input) (input as HTMLInputElement).focus();
  }
}

const cycleItems = computed(() => timeStore.cycles);

const selectedCycleName = computed(() => {
  const found = timeStore.cycles.find(c => c.id === selectedCycleId.value);
  return found?.name ?? '';
});

// Filtrado reactivo de la lista de sílabos
const filteredSyllabusesList = computed(() => {
  let list = store.syllabiList.map(syllabus => {
    const course = catalogsStore.courses.find(c => c.id === syllabus.courseId);
    return {
      ...syllabus,
      courseName: course ? course.name : 'Curso Desconocido'
    };
  });
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(item => item.courseName.toLowerCase().includes(q));
  }
  
  return list;
});

// Estadísticas dinámicas basadas en el catálogo y los sílabos activos
const activeSyllabiCount = computed(() => store.syllabiList.filter(s => s.isActive).length);
const totalCatalogCoursesCount = computed(() => catalogsStore.courses.length);
const coveragePercent = computed(() => {
  if (!totalCatalogCoursesCount.value) return 0;
  return Math.round((activeSyllabiCount.value / totalCatalogCoursesCount.value) * 100);
});

function openCreate(courseId?: string) {
  if (slideOverRef.value) {
    if (courseId) slideOverRef.value.form.courseId = courseId;
    slideOverRef.value.form.cycleId = selectedCycleId.value;
    slideOverRef.value.isOpen = true;
  }
}

// Open distribution editor matrix
function openSyllabus(syllabus: any) {
  store.syllabus = syllabus;
}

function backToList() {
  store.syllabus = null;
}

async function onToggleSyllabus(syllabusId: string, isActive: boolean) {
  try {
    await store.toggleSyllabusVisibility(syllabusId, isActive);
    toast.add({
      title: isActive ? 'Sílabo reactivado' : 'Sílabo archivado',
      color: 'success',
      timeout: 2000
    });
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.message || 'No se pudo actualizar el estado del sílabo',
      color: 'red',
      timeout: 3000
    });
  }
}
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-6">

    <!-- 1. Encabezado de la Página -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-700/30 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Gestión de Sílabos</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configura la distribución semanal de preguntas para tus cursos según el ciclo académico seleccionado.
        </p>
      </div>

      <!-- Selector de ciclo y botón Añadir -->
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 select-none">Ciclo Académico:</span>
        <USelectMenu
          v-model="selectedCycleId"
          :items="cycleItems"
          value-key="id"
          label-key="name"
          placeholder="Seleccionar ciclo..."
          class="w-56"
          :search-input="false"
        />
        <UButton 
          v-if="!store.syllabus" 
          color="indigo" 
          icon="i-heroicons-plus"
          size="md"
          class="font-semibold shadow-sm hover:shadow rounded-xl transition-all duration-200"
          @click="openCreate()"
        >
          Crear Sílabo
        </UButton>
      </div>
    </div>

    <!-- ── CASO A: Matriz de Distribución (Edición activa de un Sílabo) ── -->
    <div v-if="store.syllabus" class="space-y-4">
      <div class="flex items-center gap-3">
        <UButton 
          icon="i-heroicons-arrow-left" 
          color="neutral" 
          variant="ghost" 
          class="font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          @click="backToList"
        >
          Volver al listado
        </UButton>
        <span class="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
          Ciclo: 
          <strong class="text-slate-700 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-lg">{{ selectedCycleName }}</strong>
        </span>
      </div>
      <SyllabusDistributionMatrix />
    </div>

    <!-- ── CASO B: Listado de Sílabos por Curso ── -->
    <div v-else class="space-y-6">
      
      <!-- 2. Panel de Estadísticas (Reactivo al Ciclo Seleccionado) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <!-- Sílabos Planificados -->
        <div class="bg-white/80 dark:bg-[#2b2b3f]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-all group duration-300">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sílabos Planificados</span>
              <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ activeSyllabiCount }} <span class="text-sm font-semibold text-slate-400">cursos</span>
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-500 shadow-sm transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-document-text" class="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <!-- Cursos Sin Planificar -->
        <div class="bg-white/80 dark:bg-[#2b2b3f]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-all group duration-300">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cursos Sin Planificar</span>
              <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {{ Math.max(0, totalCatalogCoursesCount - activeSyllabiCount) }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100/50 dark:border-amber-900/50 flex items-center justify-center text-amber-500 shadow-sm transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
            </div>
          </div>
        </div>

        <!-- Cobertura Global -->
        <div class="bg-white/80 dark:bg-[#2b2b3f]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-all group duration-300">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cobertura de Sílabos</span>
              <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {{ coveragePercent }}% <span class="text-xs text-slate-400 font-medium">del catálogo</span>
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/50 flex items-center justify-center text-emerald-500 shadow-sm transition-transform group-hover:scale-110">
              <UIcon name="i-heroicons-check-badge" class="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Barra de Búsqueda y Filtro Premium -->
      <div class="bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div class="flex-1 w-full max-w-md relative">
          <UInput
            v-model="searchQuery"
            placeholder="Buscar por curso..."
            icon="i-heroicons-magnifying-glass"
            size="md"
            color="gray"
            variant="outline"
            class="w-full"
            id="syllabus-search-input"
            :ui="{ icon: { trailing: { pointer: '' } } }"
          >
            <template #trailing>
              <div class="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono select-none">
                /
              </div>
            </template>
          </UInput>
        </div>
        <span class="text-xs text-slate-450 dark:text-slate-500 select-none hidden sm:inline-block font-medium">
          Mostrando {{ filteredSyllabusesList.length }} sílabos
        </span>
      </div>

      <!-- 4. Contenedor del Listado Estilo Tarjetas Horizontales -->
      <div class="space-y-3.5">
        <!-- Encabezados de Columna (Alineados con el grid de las Cards) -->
        <div v-if="filteredSyllabusesList.length > 0 && !(timeStore.isLoading || catalogsStore.isLoading || store.loading)" class="hidden md:grid grid-cols-12 px-6 py-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
          <div class="col-span-6">Curso</div>
          <div class="col-span-3">Estado Sílabo</div>
          <div class="col-span-3 text-right">Acciones</div>
        </div>

        <!-- Skeletons de Carga -->
        <div v-if="timeStore.isLoading || catalogsStore.isLoading || store.loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-20 bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-750/30 animate-pulse" />
        </div>

        <template v-else>
          <!-- Filas de Tarjetas Horizontales -->
          <div
            v-for="item in filteredSyllabusesList"
            :key="item.id"
            class="bg-white dark:bg-[#2b2b3f] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 grid grid-cols-1 md:grid-cols-12 items-center gap-4 group"
          >
            <!-- Columna: Curso con Avatar Premium -->
            <div class="col-span-12 md:col-span-6 flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 dark:border-indigo-900/30 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <UIcon name="i-heroicons-book-open" class="w-5.5 h-5.5" />
              </div>
              <span class="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ item.courseName }}</span>
            </div>

            <!-- Columna: Estado Badge Premium -->
            <div class="col-span-6 md:col-span-3">
              <span
                v-if="item.isActive"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ✓ Planificado
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Archivado
              </span>
            </div>

            <!-- Columna: Acciones Agrupadas -->
            <div class="col-span-6 md:col-span-3 flex justify-end items-center gap-2">
              <UButton
                size="sm"
                :color="item.isActive ? 'error' : 'success'"
                variant="soft"
                class="font-bold rounded-xl"
                :icon="item.isActive ? 'i-heroicons-archive-box-arrow-down' : 'i-heroicons-arrow-path'"
                @click="onToggleSyllabus(item.id, !item.isActive)"
              >
                {{ item.isActive ? 'Archivar' : 'Activar' }}
              </UButton>

              <UButton 
                size="sm" 
                color="indigo" 
                variant="soft" 
                class="font-bold rounded-xl shadow-inner border border-indigo-200/20"
                icon="i-heroicons-pencil-square" 
                @click="openSyllabus(item)"
              >
                Editar
              </UButton>
            </div>
          </div>

          <!-- Estado Vacío (No hay sílabos para el ciclo) -->
          <div v-if="filteredSyllabusesList.length === 0" class="py-24 text-center bg-white dark:bg-[#2b2b3f] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div class="max-w-md mx-auto space-y-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-500 mx-auto shadow-sm">
                <UIcon name="i-heroicons-document-plus" class="w-7 h-7" />
              </div>
              <div class="space-y-1">
                <p class="text-base font-bold text-slate-800 dark:text-slate-200">No hay sílabos configurados</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Para comenzar a planificar este ciclo, crea un nuevo sílabo vinculando un curso del catálogo.
                </p>
              </div>
              <UButton 
                color="indigo" 
                icon="i-heroicons-plus" 
                class="font-bold rounded-xl shadow"
                @click="openCreate()"
              >
                Crear Primer Sílabo
              </UButton>
            </div>
          </div>
        </template>
      </div>

      <!-- Leyenda / Indicador de Teclado -->
      <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-550 pt-2 select-none">
        <kbd class="inline-flex h-5 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 text-[10px] font-bold text-slate-450 font-mono shadow-sm">⌘ K</kbd>
        <span>o</span>
        <kbd class="inline-flex h-5 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 text-[10px] font-bold text-slate-450 font-mono shadow-sm">/</kbd>
        <span>para enfocar el buscador de cursos</span>
      </div>
    </div>

    <SyllabusSlideOver ref="slideOverRef" />
  </div>
</template>

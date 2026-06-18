import { ref, computed } from 'vue'

export interface TableConfig<T> {
  data: () => T[];
  searchFields?: (keyof T)[];
  defaultSort?: { key: keyof T, order: 'asc' | 'desc' };
}

export function useTableData<T extends Record<string, any>>(config: TableConfig<T>) {
  const searchQuery = ref('')
  const sortKey = ref<keyof T | null>(config.defaultSort?.key || null)
  const sortOrder = ref<'asc' | 'desc'>(config.defaultSort?.order || 'asc')

  const filteredAndSortedData = computed(() => {
    let result = config.data()

    if (searchQuery.value && config.searchFields?.length) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(item => 
        config.searchFields!.some(field => {
          const val = item[field]
          return val ? String(val).toLowerCase().includes(query) : false
        })
      )
    }

    if (sortKey.value) {
      result = [...result].sort((a, b) => {
        const valA = a[sortKey.value!]
        const valB = b[sortKey.value!]
        if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  })

  return {
    searchQuery,
    sortKey,
    sortOrder,
    filteredAndSortedData
  }
}

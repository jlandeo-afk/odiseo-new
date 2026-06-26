import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

export interface PdfDesignTemplate {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  fontFamily: string | null
  headerText: string | null
  footerText: string | null
  showCover: boolean
  backgroundUrl: string | null
  showPagination: boolean
  showFrame: boolean
  contactInfo: string | null
  isDefault: boolean
  createdAt: string
}

export const usePdfDesignsStore = defineStore('pdfDesigns', () => {
  const designs = ref<PdfDesignTemplate[]>([])
  const currentDesign = ref<PdfDesignTemplate | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function getHeaders() {
    const authStore = useAuthStore()
    return { 'x-subdomain': authStore.getSubdomain() }
  }

  async function fetchDesigns() {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/v1/pdf-designs', { headers: getHeaders() })
      designs.value = data as PdfDesignTemplate[]
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al cargar diseños'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDesign(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch(`/api/v1/pdf-designs/${id}`, { headers: getHeaders() })
      currentDesign.value = data as PdfDesignTemplate
      return currentDesign.value
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al cargar diseño'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function createDesign(dto: Partial<PdfDesignTemplate>) {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/v1/pdf-designs', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: dto,
      })
      designs.value.unshift(data as PdfDesignTemplate)
      return data as PdfDesignTemplate
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al crear diseño'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function updateDesign(id: string, dto: Partial<PdfDesignTemplate>) {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch(`/api/v1/pdf-designs/${id}`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: dto,
      })
      const idx = designs.value.findIndex(d => d.id === id)
      if (idx >= 0) designs.value[idx] = data as PdfDesignTemplate
      if (currentDesign.value?.id === id) currentDesign.value = data as PdfDesignTemplate
      return data as PdfDesignTemplate
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al actualizar diseño'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function deleteDesign(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/pdf-designs/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      designs.value = designs.value.filter(d => d.id !== id)
      if (currentDesign.value?.id === id) currentDesign.value = null
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al eliminar diseño'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function uploadLogo(designId: string, file: File) {
    isLoading.value = true
    error.value = null
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await $fetch(`/api/v1/pdf-designs/${designId}/upload-logo`, {
        method: 'POST',
        headers: getHeaders(),
        body: form,
      })
      const result = data as { logoUrl: string }
      const design = designs.value.find(d => d.id === designId)
      if (design) design.logoUrl = result.logoUrl
      if (currentDesign.value?.id === designId) currentDesign.value.logoUrl = result.logoUrl
      return result.logoUrl
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al subir logo'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function uploadBackground(designId: string, file: File) {
    isLoading.value = true
    error.value = null
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await $fetch(`/api/v1/pdf-designs/${designId}/upload-background`, {
        method: 'POST',
        headers: getHeaders(),
        body: form,
      })
      const result = data as { backgroundUrl: string }
      const design = designs.value.find(d => d.id === designId)
      if (design) design.backgroundUrl = result.backgroundUrl
      if (currentDesign.value?.id === designId) currentDesign.value.backgroundUrl = result.backgroundUrl
      return result.backgroundUrl
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al subir fondo'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function deleteAsset(designId: string, type: 'logo' | 'background') {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/pdf-designs/${designId}/asset?type=${type}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      const design = designs.value.find(d => d.id === designId)
      if (design) {
        if (type === 'logo') design.logoUrl = null
        else design.backgroundUrl = null
      }
      if (currentDesign.value?.id === designId) {
        if (type === 'logo') currentDesign.value.logoUrl = null
        else currentDesign.value.backgroundUrl = null
      }
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al eliminar asset'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPreview(designId: string, body?: Record<string, any>) {
    try {
      const data = await $fetch(`/api/v1/pdf-designs/${designId}/preview`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: body || {},
      })
      return (data as { html: string }).html
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Error al generar preview'
      throw e
    }
  }

  return {
    designs, currentDesign, isLoading, error,
    fetchDesigns, fetchDesign, createDesign, updateDesign, deleteDesign,
    uploadLogo, uploadBackground, deleteAsset, fetchPreview,
  }
})

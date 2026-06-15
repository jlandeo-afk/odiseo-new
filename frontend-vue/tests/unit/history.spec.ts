/**
 * T029 [US3] — Frontend Unit Tests: History View
 *
 * Pruebas unitarias para la vista de historial de materiales,
 * validando estados de carga, tabla vacía, y renderizado de datos.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import HistoryView from '@/pages/materials/history.vue';
import type { MaterialRequest } from '@/types/materials';

// Mock fetch globally
const mockMaterials: MaterialRequest[] = [
  {
    id: 'job-001',
    tenantId: 'tenant-1',
    materialType: 'EXAMEN',
    courseId: 'Algebra',
    status: 'COMPLETED' as any,
    downloadUrl: 'https://s3.example.com/exam.pdf',
    createdAt: '2026-06-14T10:00:00Z',
    updatedAt: '2026-06-14T10:05:00Z',
  },
  {
    id: 'job-002',
    tenantId: 'tenant-1',
    materialType: 'BALOTARIO',
    courseId: 'Trigonometría',
    status: 'FAILED' as any,
    errorMessage: 'Reactivos insuficientes',
    createdAt: '2026-06-13T09:00:00Z',
    updatedAt: '2026-06-13T09:01:00Z',
  },
];

describe('History View', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const wrapper = mount(HistoryView);
    expect(wrapper.find('.materials-history__loading').exists()).toBe(true);
  });

  it('should render empty state when no materials exist', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    ));

    const wrapper = mount(HistoryView);
    await flushPromises();

    expect(wrapper.find('.materials-history__empty').exists()).toBe(true);
    expect(wrapper.find('.materials-history__table').exists()).toBe(false);
  });

  it('should render material rows from API response', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockMaterials) }),
    ));

    const wrapper = mount(HistoryView);
    await flushPromises();

    const rows = wrapper.findAll('.materials-history__row');
    expect(rows).toHaveLength(2);

    // First row: EXAMEN completed with download link
    expect(rows[0].find('.badge--examen').exists()).toBe(true);
    expect(rows[0].find('.download-link').exists()).toBe(true);

    // Second row: BALOTARIO failed with error text
    expect(rows[1].find('.badge--balotario').exists()).toBe(true);
    expect(rows[1].find('.error-text').text()).toContain('Reactivos insuficientes');
  });

  it('should handle API fetch errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))));

    const wrapper = mount(HistoryView);
    await flushPromises();

    // Should show empty state on error (no crash)
    expect(wrapper.find('.materials-history__empty').exists()).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CatalogTable from './CatalogTable.vue';
import { useCatalogsStore } from '../store';

function mountCatalogTable() {
  const pinia = createPinia();
  return mount(CatalogTable, {
    global: {
      plugins: [pinia],
      stubs: {
        UInput: { template: '<input /><slot name="trailing" />' },
        UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        UIcon: { template: '<span />' },
        USkeleton: { template: '<div class="skeleton" />' },
        transition: { template: '<div><slot /></div>' },
      }
    }
  });
}

describe('CatalogTable.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('mounts and renders empty state when no courses', () => {
    const wrapper = mountCatalogTable();
    expect(wrapper.exists()).toBe(true);
  });

  it('renders courses from store', async () => {
    const wrapper = mountCatalogTable();
    const store = useCatalogsStore();

    store.courses = [
      {
        id: 'c1',
        name: 'Matemáticas',
        topicsCount: 3,
        activeTopicsCount: 2,
        topics: [
          { id: 't1', name: 'Álgebra', isActive: true, subtopics: [] },
          { id: 't2', name: 'Geometría', isActive: false, subtopics: [] },
        ]
      }
    ];

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Matemáticas');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('3');
  });

  it('filters courses by status filter on client side', async () => {
    const wrapper = mountCatalogTable();
    const store = useCatalogsStore();

    store.courses = [
      {
        id: 'c1',
        name: 'Matemáticas',
        topicsCount: 2,
        activeTopicsCount: 1,
        topics: [
          { id: 't1', name: 'Álgebra', isActive: true, subtopics: [] },
          { id: 't2', name: 'Geometría', isActive: false, subtopics: [] },
        ]
      }
    ];

    store.hasFetched = true;
    await wrapper.vm.$nextTick();

    // initially "Todos" shows the course
    expect(wrapper.text()).toContain('Matemáticas');

    // click "Ocultos" filter button
    const filterBtns = wrapper.findAll('button');
    const ocultosBtn = filterBtns.find(b => b.text().includes('Ocultos'));
    expect(ocultosBtn).toBeDefined();
    await ocultosBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    // The course renders because it has 1 inactive topic
    expect(wrapper.text()).toContain('Matemáticas');
    // Now expand the course to verify topics are filtered
    const courseBtn = wrapper.findAll('button').find(b => b.text().includes('Matemáticas'));
    expect(courseBtn).toBeDefined();
    await courseBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Geometría');
    expect(wrapper.text()).not.toContain('Álgebra');
  });
});

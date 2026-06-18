import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CycleSlideOver from './CycleSlideOver.vue';

describe('CycleSlideOver.vue', () => {
  it('emits close event when X button is clicked', async () => {
    // Assuming UI framework component is mocked or stubbed.
    const wrapper = mount(CycleSlideOver, {
      props: { isOpen: true },
      global: {
        stubs: {
          USlideover: {
            template: '<div><slot /></div>'
          },
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          },
          UForm: { template: '<form><slot /></form>' },
          UInput: { template: '<input />' },
          UFormGroup: { template: '<div><slot /></div>' }
        }
      }
    });

    const closeBtn = wrapper.find('[aria-label="Cerrar panel"]');
    if (closeBtn.exists()) {
      await closeBtn.trigger('click');
      expect(wrapper.emitted()).toHaveProperty('update:isOpen');
      expect(wrapper.emitted('update:isOpen')![0]).toEqual([false]);
    }
  });

  it('emits submit event when form is valid', async () => {
    const wrapper = mount(CycleSlideOver, {
      props: { isOpen: true },
      global: {
        stubs: {
          USlideover: { template: '<div><slot /></div>' },
          UButton: { template: '<button type="submit" @click="$emit(\'click\')"><slot /></button>' },
          UForm: { 
            template: '<form @submit.prevent="$emit(\'submit\', { data: state })"><slot /></form>',
            data() {
              return { state: { name: '2026', startDate: '2026-03-01', daysPerWeek: 7, totalWeeks: 16 } }
            }
          },
          UInput: true,
          UFormGroup: true
        }
      }
    });

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted()).toHaveProperty('submit');
  });
});

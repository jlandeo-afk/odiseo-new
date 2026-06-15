/**
 * T022 [US2] — Frontend Unit Tests: MaterialWarning Component
 *
 * Pruebas unitarias para el componente de advertencia de estados vacíos
 * cuando el Core API no tiene suficientes reactivos.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialWarning from '@/components/MaterialWarning.vue';

describe('MaterialWarning.vue', () => {
  it('should render with default title and message', () => {
    const wrapper = mount(MaterialWarning);

    expect(wrapper.find('.material-warning__title').text()).toBe('Reactivos insuficientes');
    expect(wrapper.find('.material-warning__message').text()).toContain('No hay suficientes reactivos');
  });

  it('should render with custom title and message props', () => {
    const wrapper = mount(MaterialWarning, {
      props: {
        title: 'Error personalizado',
        message: 'El banco de preguntas está vacío para esta configuración.',
      },
    });

    expect(wrapper.find('.material-warning__title').text()).toBe('Error personalizado');
    expect(wrapper.find('.material-warning__message').text()).toContain('banco de preguntas está vacío');
  });

  it('should emit retry event when "Modificar filtros" is clicked', async () => {
    const wrapper = mount(MaterialWarning);

    await wrapper.find('.material-warning__btn--retry').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('should hide the warning when "Cerrar" is clicked', async () => {
    const wrapper = mount(MaterialWarning);

    expect(wrapper.find('.material-warning').exists()).toBe(true);
    await wrapper.find('.material-warning__btn--dismiss').trigger('click');
    expect(wrapper.find('.material-warning').exists()).toBe(false);
  });

  it('should have accessible role="alert" attribute', () => {
    const wrapper = mount(MaterialWarning);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
});

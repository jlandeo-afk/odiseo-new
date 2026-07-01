import { ref, watch } from 'vue';

export function watchDebounced(source: any, callback: any, options: any = {}) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  watch(source, (val: any) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => callback(val), options.debounce || 0);
  });
}

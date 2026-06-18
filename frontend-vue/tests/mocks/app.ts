import { vi } from 'vitest';

// Define Nuxt compiler macros globally for unit testing Vue files
if (typeof global !== 'undefined') {
  (global as any).definePageMeta = vi.fn();
}

export const useRequestHeaders = vi.fn(() => ({}));
export const defineNuxtRouteMiddleware = vi.fn((fn) => fn);
export const navigateTo = vi.fn();
export const abortNavigation = vi.fn();
export const useRouter = vi.fn(() => ({
  push: vi.fn(),
}));
export const useToast = vi.fn(() => ({
  add: vi.fn(),
}));

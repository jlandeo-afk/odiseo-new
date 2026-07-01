import { vi } from 'vitest';

// Nuxt auto-imports these functions globally
(global as any).useToast = vi.fn(() => ({
  add: vi.fn(),
}));

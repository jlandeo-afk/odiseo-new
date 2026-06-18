import { setActivePinia, createPinia } from 'pinia';
import { useCatalogsStore } from './index';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Catalogs Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    global.$fetch = vi.fn();
  });

  it('toggles topic visibility optimistically', async () => {
    const store = useCatalogsStore();
    
    // Setup initial state
    store.courses = [
      {
        id: 'c1',
        name: 'Math',
        topics: [
          { id: 't1', name: 'Algebra', isActive: true, subtopics: [] }
        ]
      }
    ];

    // Mock API response for $fetch
    (global.$fetch as any).mockResolvedValue({ id: 't1', isActive: false });

    await store.toggleVisibility('t1', false);

    // Verify optimistic update
    const topic = store.courses[0].topics[0];
    expect(topic.isActive).toBe(false);
    expect(global.$fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/catalogs/topics/t1/visibility'),
      expect.objectContaining({
        method: 'PATCH',
        body: { isActive: false }
      })
    );
  });
});

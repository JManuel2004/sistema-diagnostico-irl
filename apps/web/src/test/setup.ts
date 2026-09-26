import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import type * as Sonner from 'sonner';

// Toasts are asserted through the mock: pages under test render no Toaster.
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof Sonner>();
  return {
    ...actual,
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

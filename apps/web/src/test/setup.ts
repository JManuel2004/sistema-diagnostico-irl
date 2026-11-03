import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import type * as Sonner from 'sonner';
import type * as HoldForMinimum from '@/shared/lib/hold-for-minimum';

// Toasts are asserted through the mock: pages under test render no Toaster.
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof Sonner>();
  return {
    ...actual,
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  };
});

vi.mock('@/shared/lib/hold-for-minimum', async (importOriginal) => {
  const actual = await importOriginal<typeof HoldForMinimum>();
  const TEST_VISIBLE_MS = 300;
  return {
    ...actual,
    PROCESSING_VISIBLE_MS: TEST_VISIBLE_MS,
    holdForMinimum: (startedAt: number, minimumMs = TEST_VISIBLE_MS) =>
      actual.holdForMinimum(startedAt, minimumMs),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

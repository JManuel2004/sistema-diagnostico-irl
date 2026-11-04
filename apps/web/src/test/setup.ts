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

// The processing screen stays at least 10 s in the product (the client asked
// to see the calculation take its time); under test that would only make
// every flow wait. A short hold keeps the screen visible, as in the product.
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

// jsdom has no modal dialogs: `showModal` and `close` only toggle `open`,
// enough for the tests to see the dialog and its content in the tree.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

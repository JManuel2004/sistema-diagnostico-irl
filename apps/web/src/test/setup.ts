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

import { toast } from 'sonner';

/**
 * The outcome of an action the user triggered (save, accept, process),
 * announced as a toast. `ToastProvider` mounts the region once; toasts are
 * announced to screen readers through it.
 */
export const notify = {
  success(message: string): void {
    toast.success(message);
  },
  error(message: string): void {
    toast.error(message);
  },
};

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type JSX,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Form controls, from `DESIGN.md` "Form input": `rounded.sm`, 1px
 * `border-strong` border (the `input` token), 40px high, focus ring from the
 * global `:focus-visible`; an error uses the `critical` border and message.
 */
const CONTROL =
  'border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-sm border px-3 text-sm disabled:opacity-50';
const INVALID = 'border-critical';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-10', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(CONTROL, 'min-h-20 py-2 leading-relaxed', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(CONTROL, 'h-10', className)} {...props}>
        {children}
      </select>
    );
  },
);

interface FieldProps {
  readonly label: string;
  /** Receives the props that tie the control to its label, hint and error. */
  readonly children: (control: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
    className: string | undefined;
  }) => ReactNode;
  readonly hint?: string;
  readonly error?: string;
  readonly className?: string;
}

/**
 * `Field` — a label, the control, an optional hint and an error message,
 * wired with `aria-describedby` / `aria-invalid`. The control is a render
 * prop so `Input`, `Textarea` and `Select` share one wrapper.
 */
export function Field({ label, children, hint, error, className }: FieldProps): JSX.Element {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': Boolean(error),
        className: error ? INVALID : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-critical text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type JSX,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Form controls: 10px radius, 1px `border-strong` border (the `input`
 * token, 3.5:1 against white), 48px high, 16px text so mobile browsers do not
 * zoom in, focus ring from the global `:focus-visible`; an error uses the
 * `critical` border and message. `Select` stays a native `<select>` with its
 * own chevron.
 */
const CONTROL =
  'border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-control border px-3.5 text-base disabled:bg-surface-muted disabled:text-muted-foreground';
const INVALID = 'border-critical';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-12', className)} {...props} />;
  },
);

/**
 * Crece con su contenido: un texto largo (el equipo, el mercado objetivo) se
 * lee completo, sin barra de desplazamiento dentro del campo.
 */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, onInput, value, ...props }, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null);

  const fitContent = useCallback((): void => {
    const node = inner.current;
    if (!node) return;
    node.style.height = 'auto';
    // `scrollHeight` no cuenta el borde (box-sizing: border-box): se suma.
    node.style.height = `${String(node.scrollHeight + node.offsetHeight - node.clientHeight)}px`;
  }, []);

  useLayoutEffect(fitContent, [fitContent, value]);

  return (
    <textarea
      ref={(node) => {
        inner.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      value={value}
      className={cn(
        CONTROL,
        'min-h-20 resize-none overflow-hidden py-3 leading-relaxed',
        className,
      )}
      onInput={(event) => {
        fitContent();
        onInput?.(event);
      }}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(CONTROL, 'h-12 cursor-pointer appearance-none pr-11', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute right-3.5 top-3.5 size-5"
        />
      </div>
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
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-foreground text-[0.9375rem] font-bold">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': Boolean(error),
        className: error ? INVALID : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-[0.8125rem] leading-snug">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-critical text-[0.8125rem] font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}

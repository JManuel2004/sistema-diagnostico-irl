import type { JSX, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

/**
 * `Alert` — status message (error, warning, information, confirmation).
 *
 * It is different from `Card`: the card holds content; the alert
 * communicates a state and therefore carries an icon and an ARIA role.
 * `DESIGN.md` requires that color is never the only signal: each tone
 * brings its icon and a text.
 *
 * `critical` uses `role="alert"` (announced immediately); the rest use
 * `role="status"`.
 */
type Tone = 'critical' | 'moderate' | 'acceptable' | 'info';

const alertVariants = cva('flex items-start gap-3 rounded-md border p-4', {
  variants: {
    tone: {
      critical: 'border-critical/30 bg-critical-bg text-critical',
      moderate: 'border-moderate/30 bg-moderate-bg text-moderate',
      acceptable: 'border-acceptable/30 bg-acceptable-bg text-acceptable',
      info: 'border-info/30 bg-info-bg text-info',
    },
  },
  defaultVariants: { tone: 'critical' },
});

const ICONS: Record<Tone, typeof AlertCircle> = {
  critical: AlertCircle,
  moderate: AlertTriangle,
  acceptable: CheckCircle2,
  info: Info,
};

interface AlertProps {
  readonly tone?: Tone;
  readonly title: string;
  readonly children?: ReactNode;
  /** The message's own action, e.g. «Reintentar». */
  readonly action?: ReactNode;
  readonly className?: string;
}

export function Alert({
  tone = 'critical',
  title,
  children,
  action,
  className,
}: AlertProps): JSX.Element {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children !== undefined && children !== null && (
          <div className="mt-1 text-sm leading-relaxed">{children}</div>
        )}
        {action !== undefined && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

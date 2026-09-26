import { cn } from '@/lib/utils';

interface LogoProps {
  /** Extra classes applied to the outer container — use to control text colour on dark backgrounds, e.g. `className="text-white"`. */
  className?: string;
  /** When true, renders only the square mark — useful in compact/icon-only contexts. */
  iconOnly?: boolean;
}

/**
 * Operant Event wordmark.
 * The square mark is always white-on-brand-blue; the accompanying text inherits
 * its colour from the className prop so it works on both light and dark surfaces.
 */
export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Square mark */}
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[0.65rem] font-bold tracking-tight text-brand-foreground select-none"
      >
        OE
      </span>
      {!iconOnly && (
        <span className="text-sm font-semibold tracking-tight">Operant Event</span>
      )}
    </div>
  );
}

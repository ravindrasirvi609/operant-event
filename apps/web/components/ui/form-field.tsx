import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  /**
   * Optional element rendered trailing the label row — e.g. a "Forgot password?" link.
   * When provided, the label row becomes a flex container with the label on the left
   * and the action on the right. The htmlFor/id association is unaffected.
   */
  action?: ReactNode;
}

/** Every form field in this app goes through here — one place that keeps label/input pairing and error announcement consistent (SRS §36). */
export function FormField({ label, htmlFor, error, children, action }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      {action ? (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
          {action}
        </div>
      ) : (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

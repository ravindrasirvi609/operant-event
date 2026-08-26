import { cn } from '@/lib/utils';

export const WIZARD_STEPS = ['Basics', 'Custom fields', 'Authors', 'Review & submit'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function SubmissionProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {WIZARD_STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full border text-xs',
              index === currentStep
                ? 'border-foreground bg-foreground text-background'
                : index < currentStep
                  ? 'border-foreground/40 text-foreground'
                  : 'border-input text-muted-foreground',
            )}
          >
            {index + 1}
          </span>
          <span className={index === currentStep ? 'font-medium' : 'text-muted-foreground'}>{step}</span>
          {index < WIZARD_STEPS.length - 1 ? <span className="text-muted-foreground">›</span> : null}
        </li>
      ))}
    </ol>
  );
}

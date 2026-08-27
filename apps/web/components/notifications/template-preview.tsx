import { highlightTemplateVariables } from '@/lib/notifications/highlight-template-variables';

/** Highlights only tokens `TemplateRendererService` would actually substitute — never a stray or malformed brace pair. */
export function TemplatePreview({ text }: { text: string }) {
  const segments = highlightTemplateVariables(text);
  return (
    <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
      {segments.map((segment, index) =>
        segment.variable ? (
          <mark key={index} className="rounded bg-primary/20 px-0.5 font-mono text-primary">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

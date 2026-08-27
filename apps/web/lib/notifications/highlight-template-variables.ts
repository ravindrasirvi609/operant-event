export interface TemplateSegment {
  text: string;
  variable: boolean;
}

/** Mirrors TemplateRendererService's exact pattern — never highlight something the backend wouldn't actually substitute. */
const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function highlightTemplateVariables(template: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;

  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ text: template.slice(lastIndex, start), variable: false });
    }
    segments.push({ text: match[0], variable: true });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < template.length) {
    segments.push({ text: template.slice(lastIndex), variable: false });
  }

  return segments;
}

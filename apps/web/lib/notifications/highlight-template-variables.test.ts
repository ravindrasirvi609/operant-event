import { describe, expect, it } from 'vitest';
import { highlightTemplateVariables } from './highlight-template-variables';

describe('highlightTemplateVariables', () => {
  it('highlights a valid {{variable}} token and leaves surrounding text as plain segments', () => {
    const segments = highlightTemplateVariables('Hello {{participantName}}, welcome.');

    expect(segments).toEqual([
      { text: 'Hello ', variable: false },
      { text: '{{participantName}}', variable: true },
      { text: ', welcome.', variable: false },
    ]);
  });

  it('does not highlight a malformed token that the backend regex would not match either', () => {
    // Matches TemplateRendererService's exact pattern /\{\{\s*([\w.]+)\s*\}\}/g —
    // a single unmatched brace is not a valid token.
    const segments = highlightTemplateVariables('Hello {participantName}, {{orderNumber}}.');

    expect(segments).toEqual([
      { text: 'Hello {participantName}, ', variable: false },
      { text: '{{orderNumber}}', variable: true },
      { text: '.', variable: false },
    ]);
  });

  it('supports dotted variable paths, matching the backend\'s [\\w.]+ character class', () => {
    const segments = highlightTemplateVariables('{{order.total}}');

    expect(segments).toEqual([{ text: '{{order.total}}', variable: true }]);
  });

  it('returns a single plain segment for text with no variables at all', () => {
    expect(highlightTemplateVariables('No variables here.')).toEqual([
      { text: 'No variables here.', variable: false },
    ]);
  });
});

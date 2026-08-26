import { TemplateRendererService } from './template-renderer.service';

describe('TemplateRendererService.render', () => {
  it('substitutes a single variable', () => {
    const service = new TemplateRendererService();

    const result = service.render('Hello {{name}}!', { name: 'Jane' });

    expect(result).toBe('Hello Jane!');
  });

  it('substitutes multiple occurrences of the same variable', () => {
    const service = new TemplateRendererService();

    const result = service.render('{{name}}, welcome {{name}}!', {
      name: 'Jane',
    });

    expect(result).toBe('Jane, welcome Jane!');
  });

  it('substitutes multiple distinct variables', () => {
    const service = new TemplateRendererService();

    const result = service.render(
      '{{name}} is registered for {{conferenceName}}.',
      {
        name: 'Jane',
        conferenceName: 'Operant Summit',
      },
    );

    expect(result).toBe('Jane is registered for Operant Summit.');
  });

  it('tolerates whitespace inside the braces', () => {
    const service = new TemplateRendererService();

    const result = service.render('Hello {{ name }}!', { name: 'Jane' });

    expect(result).toBe('Hello Jane!');
  });

  it('throws a clear error when a template variable has no matching data, rather than rendering a silent blank', () => {
    const service = new TemplateRendererService();

    expect(() => service.render('Hello {{name}}!', {})).toThrow(/name/);
  });

  it('renders a template with no variables unchanged', () => {
    const service = new TemplateRendererService();

    const result = service.render('Hello there!', {});

    expect(result).toBe('Hello there!');
  });
});

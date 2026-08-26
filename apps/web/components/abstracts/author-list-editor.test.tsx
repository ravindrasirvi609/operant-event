import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthorListEditor } from './author-list-editor';
import type { AuthorInput } from '@/lib/abstracts/types';

describe('AuthorListEditor', () => {
  it('rejects submitting with zero presenting authors', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<AuthorListEditor defaultAuthors={[{ firstName: 'A', lastName: 'B' }]} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save authors/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/exactly one author must be marked as presenting/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects submitting with two presenting authors', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const authors: AuthorInput[] = [
      { firstName: 'A', lastName: 'One', isPresenting: true },
      { firstName: 'B', lastName: 'Two', isPresenting: true },
    ];
    render(<AuthorListEditor defaultAuthors={authors} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save authors/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/exactly one author must be marked as presenting/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('accepts submitting with exactly one presenting author', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const authors: AuthorInput[] = [
      { firstName: 'A', lastName: 'One', isPresenting: true },
      { firstName: 'B', lastName: 'Two', isPresenting: false },
    ];
    render(<AuthorListEditor defaultAuthors={authors} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save authors/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toHaveLength(2);
  });

  it('rejects more than one corresponding author', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const authors: AuthorInput[] = [
      { firstName: 'A', lastName: 'One', isPresenting: true, isCorresponding: true },
      { firstName: 'B', lastName: 'Two', isCorresponding: true },
    ];
    render(<AuthorListEditor defaultAuthors={authors} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save authors/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at most one author may be marked as corresponding/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('adds a new author row', async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthorListEditor defaultAuthors={[{ firstName: 'A', lastName: 'One' }]} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add author/i }));

    expect(container.querySelectorAll('[data-testid="author-first-name"]')).toHaveLength(2);
  });

  it('removes an author row', async () => {
    const user = userEvent.setup();
    const authors: AuthorInput[] = [
      { firstName: 'A', lastName: 'One' },
      { firstName: 'B', lastName: 'Two' },
    ];
    const { container } = render(<AuthorListEditor defaultAuthors={authors} onSave={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: /remove/i })[0]);

    expect(container.querySelectorAll('[data-testid="author-first-name"]')).toHaveLength(1);
  });
});

import { validateAuthorFlags } from './abstract-authors.util';

describe('validateAuthorFlags', () => {
  it('passes with exactly one presenting author and no corresponding author', () => {
    expect(validateAuthorFlags([{ isPresenting: true }, {}])).toEqual([]);
  });

  it('passes with exactly one presenting and exactly one corresponding author', () => {
    expect(
      validateAuthorFlags([{ isPresenting: true, isCorresponding: true }, {}]),
    ).toEqual([]);
  });

  it('rejects zero presenting authors', () => {
    const errors = validateAuthorFlags([{}, {}]);
    expect(errors).toContain(
      'Exactly one author must be marked as presenting (found 0).',
    );
  });

  it('rejects more than one presenting author', () => {
    const errors = validateAuthorFlags([
      { isPresenting: true },
      { isPresenting: true },
    ]);
    expect(errors).toContain(
      'Exactly one author must be marked as presenting (found 2).',
    );
  });

  it('rejects more than one corresponding author', () => {
    const errors = validateAuthorFlags([
      { isPresenting: true, isCorresponding: true },
      { isCorresponding: true },
    ]);
    expect(errors).toContain(
      'At most one author may be marked as corresponding (found 2).',
    );
  });
});

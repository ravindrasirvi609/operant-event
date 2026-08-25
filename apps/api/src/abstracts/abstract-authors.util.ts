export interface AuthorFlagsInput {
  isPresenting?: boolean;
  isCorresponding?: boolean;
}

/** ABS-003: exactly one presenting author; at most one corresponding author. */
export function validateAuthorFlags(authors: AuthorFlagsInput[]): string[] {
  const errors: string[] = [];
  const presentingCount = authors.filter(
    (author) => author.isPresenting,
  ).length;
  const correspondingCount = authors.filter(
    (author) => author.isCorresponding,
  ).length;

  if (presentingCount !== 1) {
    errors.push(
      `Exactly one author must be marked as presenting (found ${presentingCount}).`,
    );
  }
  if (correspondingCount > 1) {
    errors.push(
      `At most one author may be marked as corresponding (found ${correspondingCount}).`,
    );
  }

  return errors;
}

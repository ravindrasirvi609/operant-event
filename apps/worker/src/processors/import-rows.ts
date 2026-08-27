export type RowValidation<T> = { ok: true; value: T } | { ok: false; error: string };

export interface AuthorRowInput {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
  designation?: string;
  institution?: string;
  department?: string;
  city?: string;
  country?: string;
}

/** Required columns match Author's own required fields exactly — everything else on the model is optional. */
export function validateAuthorRow(row: Record<string, string>): RowValidation<AuthorRowInput> {
  const firstName = row.firstName?.trim();
  const lastName = row.lastName?.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: 'firstName and lastName are required.' };
  }
  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email: row.email?.trim() || undefined,
      mobile: row.mobile?.trim() || undefined,
      designation: row.designation?.trim() || undefined,
      institution: row.institution?.trim() || undefined,
      department: row.department?.trim() || undefined,
      city: row.city?.trim() || undefined,
      country: row.country?.trim() || undefined,
    },
  };
}

export interface ReviewerRowInput {
  email: string;
}

/**
 * Only validates the column is present — resolving it to an existing
 * User happens in the DB-touching orchestration step. A row whose email
 * matches no existing user fails that row rather than creating an
 * account as a side effect of a bulk import.
 */
export function validateReviewerRow(row: Record<string, string>): RowValidation<ReviewerRowInput> {
  const email = row.email?.trim();
  if (!email) {
    return { ok: false, error: 'email is required.' };
  }
  return { ok: true, value: { email } };
}

export interface RegistrationRowInput {
  email: string;
  categoryName: string;
  typeName: string;
}

/**
 * Deliberately requires an exact category+type name pair rather than
 * resolving a "currently effective" pricing window the way the
 * self-service registration flow does (RegistrationsService.register) —
 * a bulk import is for known, already-agreed registrations (e.g.
 * pre-negotiated comps), not simulating a live self-service pick. This
 * is a scoping decision, disclosed here, not an oversight.
 */
export function validateRegistrationRow(row: Record<string, string>): RowValidation<RegistrationRowInput> {
  const email = row.email?.trim();
  const categoryName = row.categoryName?.trim();
  const typeName = row.typeName?.trim();
  if (!email || !categoryName || !typeName) {
    return { ok: false, error: 'email, categoryName, and typeName are all required.' };
  }
  return { ok: true, value: { email, categoryName, typeName } };
}

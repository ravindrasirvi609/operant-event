import { isValidConferenceStatusTransition } from './conference-status.util';

describe('isValidConferenceStatusTransition', () => {
  it.each([
    ['DRAFT', 'OPEN'],
    ['DRAFT', 'ARCHIVED'],
    ['OPEN', 'REVIEW'],
    ['REVIEW', 'REGISTRATION'],
    ['REGISTRATION', 'ONGOING'],
    ['ONGOING', 'COMPLETED'],
    ['COMPLETED', 'ARCHIVED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(isValidConferenceStatusTransition(from, to)).toBe(true);
  });

  it.each([
    ['DRAFT', 'ONGOING'],
    ['DRAFT', 'COMPLETED'],
    ['OPEN', 'DRAFT'],
    ['ARCHIVED', 'DRAFT'],
    ['ARCHIVED', 'OPEN'],
    ['COMPLETED', 'ONGOING'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(isValidConferenceStatusTransition(from, to)).toBe(false);
  });

  it('rejects a no-op transition to the same status', () => {
    expect(isValidConferenceStatusTransition('OPEN', 'OPEN')).toBe(false);
  });
});

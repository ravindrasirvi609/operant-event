import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('APTICON Medical Society')).toBe('apticon-medical-society');
  });

  it('strips characters that are not letters, numbers, or hyphens', () => {
    expect(slugify("Ravindra's Conference & Co.")).toBe(
      'ravindras-conference-co',
    );
  });

  it('collapses repeated separators into a single hyphen', () => {
    expect(slugify('Too   Many---Spaces')).toBe('too-many-spaces');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Leading and trailing--  ')).toBe(
      'leading-and-trailing',
    );
  });
});

import { rankReviewersByKeywords } from './reviewer-ranking.util';

describe('rankReviewersByKeywords', () => {
  it('ranks a reviewer whose keywords match more query terms higher', () => {
    const ranked = rankReviewersByKeywords(
      [
        { reviewerId: 'reviewer-a', keywords: ['oncology'], expertise: [] },
        {
          reviewerId: 'reviewer-b',
          keywords: ['oncology', 'immunotherapy'],
          expertise: ['clinical trials'],
        },
      ],
      ['oncology', 'immunotherapy', 'clinical trials'],
    );

    expect(ranked[0].reviewerId).toBe('reviewer-b');
    expect(ranked[0].matchScore).toBe(3);
    expect(ranked[1].reviewerId).toBe('reviewer-a');
    expect(ranked[1].matchScore).toBe(1);
  });

  it('is case-insensitive when matching terms', () => {
    const ranked = rankReviewersByKeywords(
      [{ reviewerId: 'reviewer-a', keywords: ['Oncology'], expertise: [] }],
      ['oncology'],
    );

    expect(ranked[0].matchScore).toBe(1);
  });

  it('gives a reviewer with no matching terms a score of zero rather than excluding them', () => {
    const ranked = rankReviewersByKeywords(
      [{ reviewerId: 'reviewer-a', keywords: ['astrology'], expertise: [] }],
      ['oncology'],
    );

    expect(ranked).toEqual([{ reviewerId: 'reviewer-a', matchScore: 0 }]);
  });
});

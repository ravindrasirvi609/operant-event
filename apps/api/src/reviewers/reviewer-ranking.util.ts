export interface ReviewerCandidate {
  reviewerId: string;
  keywords: string[];
  expertise: string[];
}

export interface RankedReviewer {
  reviewerId: string;
  matchScore: number;
}

/** Simple term-overlap ranking — every candidate is returned (never filtered), just ordered by relevance. */
export function rankReviewersByKeywords(
  candidates: ReviewerCandidate[],
  queryTerms: string[],
): RankedReviewer[] {
  const normalizedQuery = new Set(queryTerms.map((term) => term.toLowerCase()));

  return candidates
    .map((candidate) => {
      const candidateTerms = [
        ...candidate.keywords,
        ...candidate.expertise,
      ].map((term) => term.toLowerCase());
      const matchScore = candidateTerms.filter((term) =>
        normalizedQuery.has(term),
      ).length;
      return { reviewerId: candidate.reviewerId, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

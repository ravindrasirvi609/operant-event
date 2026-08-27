import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewerAssignmentCard } from './reviewer-assignment-card';
import type { ReviewAssignmentProjection } from '@/lib/reviewers/types';

function makeAssignment(overrides: Partial<ReviewAssignmentProjection> = {}): ReviewAssignmentProjection {
  return {
    id: 'assignment-1',
    status: 'PENDING',
    dueDate: '2027-01-10T00:00:00Z',
    assignedAt: '2027-01-01T00:00:00Z',
    abstract: {
      id: 'abs-1',
      title: 'A Study of Something',
      submissionType: 'ORAL',
      status: 'UNDER_REVIEW',
    },
    review: null,
    ...overrides,
  };
}

describe('ReviewerAssignmentCard', () => {
  it('renders zero author-identity DOM nodes when submittedBy is absent (blind mode)', () => {
    const assignment = makeAssignment();
    // Explicitly confirm the fixture matches the real blind-mode API contract: the key is absent, not undefined-valued.
    expect('submittedBy' in assignment.abstract).toBe(false);

    render(<ReviewerAssignmentCard assignment={assignment} />);

    expect(screen.queryByText(/author/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('assignment-author')).not.toBeInTheDocument();
  });

  it('renders the author identity when submittedBy is present (OPEN review mode)', () => {
    const assignment = makeAssignment({
      abstract: {
        id: 'abs-1',
        title: 'A Study of Something',
        submissionType: 'ORAL',
        status: 'UNDER_REVIEW',
        submittedBy: 'user-42',
      },
    });

    render(<ReviewerAssignmentCard assignment={assignment} />);

    expect(screen.getByTestId('assignment-author')).toBeInTheDocument();
  });

  it('always shows the abstract title, status, and due date regardless of review mode', () => {
    render(<ReviewerAssignmentCard assignment={makeAssignment()} />);

    expect(screen.getByText('A Study of Something')).toBeInTheDocument();
    expect(screen.getByText(/1\/10\/2027|10\/1\/2027|2027/)).toBeInTheDocument();
  });

  it('shows the submitted recommendation and scores when a review exists', () => {
    const assignment = makeAssignment({
      status: 'COMPLETED',
      review: {
        id: 'review-1',
        assignmentId: 'assignment-1',
        overallScore: 4,
        originalityScore: 4,
        methodologyScore: 3,
        significanceScore: 4,
        presentationScore: 5,
        commentsToAuthor: 'Good work.',
        privateComments: null,
        recommendation: 'ACCEPT',
        submittedAt: '2027-01-05T00:00:00Z',
      },
    });

    render(<ReviewerAssignmentCard assignment={assignment} />);

    expect(screen.getByText('ACCEPT')).toBeInTheDocument();
  });
});

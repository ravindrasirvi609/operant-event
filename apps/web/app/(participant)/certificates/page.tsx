
'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import {
  useMyCertificates,
  useMyConferenceFeedback,
  useSubmitConferenceFeedback,
  type SubmitConferenceFeedbackInput,
} from '@/hooks/use-certificates';

import type { MyCertificate } from '@/lib/certificates/types';
import { CertificateView } from '@/components/certificates/certificate-view';
import { AsyncBoundary } from '@/components/query/async-boundary';

type ConferenceGroupProps = {
  certificates: MyCertificate[];
};

const CONTENT_RATINGS: SubmitConferenceFeedbackInput['contentRating'][] = [
  'Excellent',
  'Good',
  'Average',
  'Needs improvement',
];

function ConferenceCertificatesGroup({
  certificates,
}: ConferenceGroupProps) {
  const firstCertificate = certificates[0];
  const conferenceId = firstCertificate.conferenceId;
  const conferenceName = firstCertificate.conference.name;

  const feedbackQuery = useMyConferenceFeedback(conferenceId);
  const submitFeedback = useSubmitConferenceFeedback(conferenceId);

  const [rating, setRating] = useState(0);
  const [contentRating, setContentRating] =
    useState<SubmitConferenceFeedbackInput['contentRating']>('Excellent');
  const [comments, setComments] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      return;
    }

    await submitFeedback.mutateAsync({
      rating,
      contentRating,
      comments: comments.trim() || undefined,
    });
  }

  if (feedbackQuery.isPending) {
    return (
      <section className="rounded-lg border p-5">
        <p className="text-sm text-muted-foreground">
          Checking feedback status for {conferenceName}...
        </p>
      </section>
    );
  }

  if (feedbackQuery.isError) {
    return (
      <section className="rounded-lg border border-destructive/40 p-5">
        <h2 className="font-semibold">{conferenceName}</h2>
        <p className="mt-2 text-sm text-destructive">
          Feedback status could not be loaded. Please try again.
        </p>
        <button
          type="button"
          onClick={() => void feedbackQuery.refetch()}
          className="mt-3 rounded-md border px-4 py-2 text-sm"
        >
          Retry
        </button>
      </section>
    );
  }

  const feedbackSubmitted = Boolean(feedbackQuery.data);

  if (!feedbackSubmitted) {
    return (
      <section className="space-y-4 rounded-lg border p-5">
        <div>
          <h2 className="text-lg font-semibold">{conferenceName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please share your conference feedback before accessing your
            certificate downloads.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              1. How would you rate your overall experience?
            </legend>

            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rating === value}
                  aria-label={`${value} out of 5 stars`}
                  onClick={() => setRating(value)}
                  className={`rounded-md border px-4 py-2 ${
                    rating === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {value} {value === 1 ? 'star' : 'stars'}
                </button>
              ))}
            </div>

            {rating === 0 && (
              <p className="text-xs text-muted-foreground">
                Select a rating from 1 to 5.
              </p>
            )}
          </fieldset>

          <div className="space-y-2">
            <label
              htmlFor={`content-rating-${conferenceId}`}
              className="text-sm font-medium"
            >
              2. How would you rate the conference content?
            </label>

            <select
              id={`content-rating-${conferenceId}`}
              value={contentRating}
              onChange={(event) =>
                setContentRating(
                  event.target
                    .value as SubmitConferenceFeedbackInput['contentRating'],
                )
              }
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {CONTENT_RATINGS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`feedback-comments-${conferenceId}`}
              className="text-sm font-medium"
            >
              3. Additional comments (optional)
            </label>

            <textarea
              id={`feedback-comments-${conferenceId}`}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Tell us what went well or what we could improve..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {submitFeedback.isError && (
            <p role="alert" className="text-sm text-destructive">
              {submitFeedback.error instanceof Error
                ? submitFeedback.error.message
                : 'Feedback could not be submitted. Please try again.'}
            </p>
          )}

          <button
            type="submit"
            disabled={rating === 0 || submitFeedback.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitFeedback.isPending ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="font-medium">Feedback submitted</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Thank you for sharing your feedback for {conferenceName}. Your
          certificate downloads are now available below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {certificates.map((certificate) => (
          <CertificateView
            key={certificate.id}
            certificate={certificate}
          />
        ))}
      </div>
    </section>
  );
}

export default function MyCertificatesPage() {
  const certificatesQuery = useMyCertificates();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit your conference feedback to access your issued certificates.
        </p>
      </div>

      <AsyncBoundary query={certificatesQuery}>
        {(certificates) => {
          if (certificates.length === 0) {
            return (
              <div className="rounded-lg border p-6">
                <h2 className="font-medium">No certificates yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your certificates will appear here when they become
                  available.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-block rounded-md border px-4 py-2 text-sm"
                >
                  Back to Dashboard
                </Link>
              </div>
            );
          }

          const groupedCertificates = new Map<string, MyCertificate[]>();

          for (const certificate of certificates) {
            const group = groupedCertificates.get(certificate.conferenceId);

            if (group) {
              group.push(certificate);
            } else {
              groupedCertificates.set(certificate.conferenceId, [certificate]);
            }
          }

          return (
            <div className="space-y-6">
              {Array.from(groupedCertificates.entries()).map(
                ([conferenceId, conferenceCertificates]) => (
                  <ConferenceCertificatesGroup
                    key={conferenceId}
                    certificates={conferenceCertificates}
                  />
                ),
              )}
            </div>
          );
        }}
      </AsyncBoundary>
    </main>
  );
}

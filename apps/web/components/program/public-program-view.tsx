
'use client';

import Link from 'next/link';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { usePublicProgram } from '@/hooks/use-sessions';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function isSpecialSession(sessionType: string | null) {
  const type = (sessionType ?? '').trim().toUpperCase();

  return ['BREAK', 'LUNCH', 'NETWORKING', 'SPECIAL_EVENT'].includes(type);
}

function getSessionTypeLabel(sessionType: string | null) {
  const type = (sessionType ?? '').trim().toUpperCase();

  switch (type) {
    case 'BREAK':
      return 'Refreshment Break';
    case 'LUNCH':
      return 'Lunch Break';
    case 'NETWORKING':
      return 'Networking';
    case 'SPECIAL_EVENT':
      return 'Special Event';
    default:
      return sessionType || 'Event';
  }
}

export function PublicProgramView({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const programQuery = usePublicProgram(conferenceId);

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/conferences/${conferenceId}/program`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">←</span>
            Back to Programme Setup
          </Link>
        </div>

        <header className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Conference Schedule
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Public Programme
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Explore the sessions, presentations, speakers and timings.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 sm:p-7">
          <AsyncBoundary
            query={programQuery}
            empty={
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center">
                <h2 className="font-semibold text-slate-800">
                  No published sessions yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Published conference sessions will appear here.
                </p>
              </div>
            }
          >
            {(sessions) => (
              <div className="space-y-5">
                {sessions.map((session) => {
                  const special = isSpecialSession(session.sessionType);

                  return (
                    <article
                      key={session.id}
                      className={`overflow-hidden rounded-xl border transition-shadow hover:shadow-md ${
                        special
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div
                        className={`border-b px-4 py-4 sm:px-6 ${
                          special
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        {special && (
                          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-700">
                            {getSessionTypeLabel(session.sessionType)}
                          </p>
                        )}

                        <h2 className="text-xl font-bold text-slate-900">
                          {session.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span>
                            <span className="font-medium text-slate-800">
                              Date:
                            </span>{' '}
                            {formatDate(session.sessionDate)}
                          </span>

                          <span>
                            <span className="font-medium text-slate-800">
                              Time:
                            </span>{' '}
                            {formatTime(session.startTime)} –{' '}
                            {formatTime(session.endTime)}
                          </span>

                          {session.room && (
                            <span>
                              <span className="font-medium text-slate-800">
                                Room:
                              </span>{' '}
                              {session.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-5 p-4 sm:p-6">
                        {session.description && (
                          <p className="text-sm leading-6 text-slate-600">
                            {session.description}
                          </p>
                        )}

                        {!special && session.speakers.length > 0 && (
                          <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Session Speakers
                            </h3>

                            <div className="flex flex-wrap gap-2">
                              {session.speakers.map((item) => (
                                <span
                                  key={`${item.sessionId}-${item.speakerId}-${item.role}`}
                                  className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm text-blue-900"
                                >
                                  {item.speaker.name}
                                  <span className="ml-2 text-xs text-blue-700">
                                    {item.role.replace('_', ' ')}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {!special && session.presentations?.length > 0 && (
                          <div className="border-t border-slate-100 pt-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <h3 className="text-lg font-semibold text-slate-900">
                                Presentations
                              </h3>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {session.presentations.length}{' '}
                                {session.presentations.length === 1
                                  ? 'presentation'
                                  : 'presentations'}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {session.presentations.map((presentation) => {
                                const title =
                                  presentation.abstract?.title ??
                                  presentation.title ??
                                  'Presentation title unavailable';

                                const presenterName =
                                  presentation.speaker?.name ??
                                  presentation.speakerName ??
                                  'Presenter not assigned';

                                const designation =
                                  presentation.speaker?.designation;

                                const affiliation =
                                  presentation.speaker?.institution ??
                                  presentation.speakerAffiliation;

                                return (
                                  <div
                                    key={presentation.id}
                                    className="rounded-xl border border-slate-200 p-4 sm:p-5"
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <h4 className="break-words text-base font-semibold leading-6 text-slate-900">
                                          {title}
                                        </h4>

                                        {presentation.abstract?.submissionNumber && (
                                          <p className="mt-1 text-xs font-medium text-slate-500">
                                            Abstract ID:{' '}
                                            {presentation.abstract.submissionNumber}
                                          </p>
                                        )}
                                      </div>

                                      <span className="inline-flex w-fit shrink-0 items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                                        {formatTime(presentation.startTime)} –{' '}
                                        {formatTime(presentation.endTime)}
                                      </span>
                                    </div>

                                    <div className="mt-4 border-t border-slate-100 pt-3">
                                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Presenter
                                      </p>

                                      <p className="mt-1 font-medium text-slate-800">
                                        {presenterName}
                                      </p>

                                      {designation && (
                                        <p className="mt-1 text-sm text-slate-600">
                                          {designation}
                                        </p>
                                      )}

                                      {affiliation && (
                                        <p className="text-sm text-slate-600">
                                          {affiliation}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </AsyncBoundary>
        </section>

        <footer className="mt-6 text-center text-xs text-slate-500">
          Conference programme · Published sessions and presentations
        </footer>
      </div>
    </main>
  );
}

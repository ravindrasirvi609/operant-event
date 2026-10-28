
'use client';

import { useRouter } from 'next/navigation';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { usePublicSponsors } from '@/hooks/use-public-sponsors';
import { useConference } from '@/hooks/use-conferences';
import type { SponsorTier } from '@/lib/sponsors/types';

const TIER_ORDER: SponsorTier[] = [
  'PLATINUM',
  'GOLD',
  'SILVER',
  'BRONZE',
];

const TIER_STYLES: Record<SponsorTier, string> = {
  PLATINUM: 'border-violet-200 bg-violet-50 text-violet-900',
  GOLD: 'border-amber-200 bg-amber-50 text-amber-900',
  SILVER: 'border-slate-300 bg-slate-100 text-slate-800',
  BRONZE: 'border-orange-200 bg-orange-50 text-orange-900',
};

function tierLabel(tier: SponsorTier) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export function PublicSponsorsView({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const router = useRouter();
  const sponsorsQuery = usePublicSponsors(conferenceId);
  const conferenceQuery = useConference(conferenceId);

  const conferenceName = conferenceQuery.data?.name;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/conferences/${encodeURIComponent(conferenceId)}/program/view`);
    }
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-10 xl:px-12 lg:py-12">
      <div className="mx-auto w-full max-w-none">
        <div className="mb-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
          >
            <span aria-hidden="true">←</span>
            <span className="break-words">
              {conferenceName || 'Conference Sponsors'}
            </span>
          </button>
        </div>

        <header className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Our Partners
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Conference Sponsors
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            We thank our sponsors for supporting this conference.
          </p>
        </header>

        <AsyncBoundary
          query={sponsorsQuery}
          empty={
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
              <h2 className="font-semibold text-slate-800">
                Sponsors will appear here
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                No public sponsors are available for this conference yet.
              </p>
            </div>
          }
        >
          {(sponsors) => {
            const sortedSponsors = [...sponsors].sort((a, b) => {
              const tierDifference =
                TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);

              return tierDifference || a.name.localeCompare(b.name);
            });

            return (
              <div className="space-y-10">
                {TIER_ORDER.map((tier) => {
                  const tierSponsors = sortedSponsors.filter(
                    (sponsor) => sponsor.tier === tier,
                  );

                  if (tierSponsors.length === 0) return null;

                  return (
                    <section key={tier} className="w-full min-w-0">
                      <div className="mb-5 flex items-center gap-4">
                        <span
                          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${TIER_STYLES[tier]}`}
                        >
                          {tierLabel(tier)} Sponsors
                        </span>
                        <div className="h-px min-w-0 flex-1 bg-slate-200" />
                      </div>

                      <div className="flex w-full flex-wrap justify-center gap-6">
                        {tierSponsors.map((sponsor) => (
                          <article
                            key={sponsor.id}
                            className="flex w-full max-w-md min-w-0 flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6"
                          >
                            <div className="mb-5 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-3 sm:h-36">
                              {sponsor.logoFileId ? (
                                <img
                                  src={`/api/proxy/conferences/${encodeURIComponent(conferenceId)}/public-sponsors/${encodeURIComponent(sponsor.logoFileId)}/logo`}
                                  alt={`${sponsor.name} logo`}
                                  className="h-full w-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  aria-label="No sponsor logo available"
                                  className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400"
                                >
                                  No logo available
                                </div>
                              )}
                            </div>

                            <span
                              className={`mb-3 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${TIER_STYLES[tier]}`}
                            >
                              {tierLabel(tier)} Partner
                            </span>

                            <h2 className="break-words text-lg font-semibold text-slate-900">
                              {sponsor.name}
                            </h2>

                            {sponsor.website && (
                              <a
                                href={sponsor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                Visit Website
                                <span aria-hidden="true">↗</span>
                              </a>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            );
          }}
        </AsyncBoundary>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          Thank you to our conference sponsors and partners.
        </footer>
      </div>
    </main>
  );
}

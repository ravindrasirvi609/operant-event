import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { ConferenceStatusBadge } from '@/components/conferences/conference-status-badge';
import type { Conference } from '@/lib/conferences/types';

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  const startFormat: Intl.DateTimeFormatOptions = sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };

  const startLabel = start.toLocaleDateString('en-US', startFormat);
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return sameMonth && start.getDate() === end.getDate() ? endLabel : `${startLabel} – ${endLabel}`;
}

function timingLabel(startDate: string, endDate: string) {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now >= start && now <= end) return 'Happening now';
  if (now > end) return 'Ended';

  const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Starts today';
  if (days === 1) return 'Starts tomorrow';
  return `Starts in ${days} days`;
}

export function ConferenceCard({ conference }: { conference: Conference }) {
  const location = [conference.venueName, conference.city].filter(Boolean).join(', ');

  return (
    <Link
      href={`/conferences/${conference.id}`}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowUpRight className="absolute right-4 top-4 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-center gap-2">
        <ConferenceStatusBadge status={conference.status} />
        <span className="text-xs text-muted-foreground">{timingLabel(conference.startDate, conference.endDate)}</span>
      </div>

      <div className="pr-6">
        <h3 className="line-clamp-1 text-base font-semibold">{conference.name}</h3>
        {conference.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{conference.description}</p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDateRange(conference.startDate, conference.endDate)}
        </span>
        {location ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            <span className="line-clamp-1">{location}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}

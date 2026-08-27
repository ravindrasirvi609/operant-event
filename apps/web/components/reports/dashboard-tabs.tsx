'use client';

import { useState } from 'react';
import { BreakdownBars } from '@/components/reports/breakdown-bars';
import { StatTile } from '@/components/reports/stat-tile';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/hooks/use-reports';
import { DASHBOARDS, type DashboardKey } from '@/lib/reports/types';
import type {
  AbstractsQuery,
  AttendanceQuery,
  CertificatesQuery,
  ConferenceOverviewQuery,
  RegistrationQuery,
  ReviewQuery,
  RevenueQuery,
} from '@/lib/reports/types';

const TABS: { key: DashboardKey; label: string }[] = [
  { key: DASHBOARDS.CONFERENCE_OVERVIEW, label: 'Overview' },
  { key: DASHBOARDS.ABSTRACTS, label: 'Abstracts' },
  { key: DASHBOARDS.REVIEW, label: 'Review' },
  { key: DASHBOARDS.REGISTRATION, label: 'Registration' },
  { key: DASHBOARDS.REVENUE, label: 'Revenue' },
  { key: DASHBOARDS.ATTENDANCE, label: 'Attendance' },
  { key: DASHBOARDS.CERTIFICATES, label: 'Certificates' },
];

/**
 * None of the 7 dashboards support date-range filtering — every tab
 * below shows a lifetime aggregate snapshot for the whole conference,
 * not a period comparison.
 */
export function DashboardTabs({ conferenceId }: { conferenceId: string }) {
  const [active, setActive] = useState<DashboardKey>(DASHBOARDS.CONFERENCE_OVERVIEW);

  return (
    <div className="space-y-4">
      <nav className="flex gap-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              'border-b-2 px-1 pb-2 text-sm',
              active === tab.key
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {active === DASHBOARDS.CONFERENCE_OVERVIEW ? <ConferenceOverviewTab conferenceId={conferenceId} /> : null}
      {active === DASHBOARDS.ABSTRACTS ? <AbstractsTab conferenceId={conferenceId} /> : null}
      {active === DASHBOARDS.REVIEW ? <ReviewTab conferenceId={conferenceId} /> : null}
      {active === DASHBOARDS.REGISTRATION ? <RegistrationTab conferenceId={conferenceId} /> : null}
      {active === DASHBOARDS.REVENUE ? <RevenueTab conferenceId={conferenceId} /> : null}
      {active === DASHBOARDS.ATTENDANCE ? <AttendanceTab conferenceId={conferenceId} /> : null}
      {active === DASHBOARDS.CERTIFICATES ? <CertificatesTab conferenceId={conferenceId} /> : null}
    </div>
  );
}

function ConferenceOverviewTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<ConferenceOverviewQuery>(conferenceId, DASHBOARDS.CONFERENCE_OVERVIEW);
  return (
    <AsyncBoundary query={query}>
      {(data) => (
        <div className="grid grid-cols-5 gap-3">
          <StatTile label="Abstracts" value={data.totalAbstracts} />
          <StatTile label="Registrations" value={data.totalRegistrations} />
          <StatTile label="Revenue" value={data.totalRevenue} />
          <StatTile label="Check-ins" value={data.totalCheckins} />
          <StatTile label="Certificates issued" value={data.totalCertificatesIssued} />
        </div>
      )}
    </AsyncBoundary>
  );
}

function AbstractsTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<AbstractsQuery>(conferenceId, DASHBOARDS.ABSTRACTS);
  return <AsyncBoundary query={query}>{(data) => <BreakdownBars data={data.byStatus} />}</AsyncBoundary>;
}

function ReviewTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<ReviewQuery>(conferenceId, DASHBOARDS.REVIEW);
  return (
    <AsyncBoundary query={query}>
      {(data) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Average overall score" value={data.averageOverallScore.toFixed(2)} />
            <StatTile label="Overdue" value={data.overdueCount} />
          </div>
          <BreakdownBars data={data.byStatus} />
        </div>
      )}
    </AsyncBoundary>
  );
}

function RegistrationTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<RegistrationQuery>(conferenceId, DASHBOARDS.REGISTRATION);
  return (
    <AsyncBoundary query={query}>
      {(data) => (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">By status</h3>
            <BreakdownBars data={data.byStatus} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">By type</h3>
            <BreakdownBars data={data.byType} />
          </div>
        </div>
      )}
    </AsyncBoundary>
  );
}

function RevenueTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<RevenueQuery>(conferenceId, DASHBOARDS.REVENUE);
  return (
    <AsyncBoundary query={query}>
      {(data) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Collected" value={data.totalCollected} />
            <StatTile label="Refunded" value={data.totalRefunded} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">By provider</h3>
            <BreakdownBars data={data.byProvider} />
          </div>
        </div>
      )}
    </AsyncBoundary>
  );
}

function AttendanceTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<AttendanceQuery>(conferenceId, DASHBOARDS.ATTENDANCE);
  return (
    <AsyncBoundary query={query}>
      {(data) => (
        <div className="space-y-4">
          <StatTile label="Unique attendees" value={data.uniqueAttendees} />
          <BreakdownBars data={data.byType} />
        </div>
      )}
    </AsyncBoundary>
  );
}

function CertificatesTab({ conferenceId }: { conferenceId: string }) {
  const query = useDashboard<CertificatesQuery>(conferenceId, DASHBOARDS.CERTIFICATES);
  return (
    <AsyncBoundary query={query}>
      {(data) => (
        <div className="space-y-4">
          {Object.entries(data.byTypeAndStatus).map(([certificateType, byStatus]) => (
            <div key={certificateType}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">{certificateType}</h3>
              <BreakdownBars data={byStatus} />
            </div>
          ))}
          {Object.keys(data.byTypeAndStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No certificates yet.</p>
          ) : null}
        </div>
      )}
    </AsyncBoundary>
  );
}

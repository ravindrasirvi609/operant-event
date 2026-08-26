# Worker Phase 5 — Certificate PDF Rendering & Batch Eligibility

**Spec:** SRS §18 (Certificates), §31.

**Depends on:** `worker/00-foundation.md`, `worker/04-invoice-pdf.md`
(shares whatever PDF-rendering library gets chosen there). Backend Phase
5 (`CertificatesService.generateForConference`/`issue` — both real and
synchronous today; `fileId` is always `null`).

**Goal:** two jobs: (1) render a real PDF for a certificate once it's
`ISSUED`, and (2) let large conferences run the eligibility sweep
(`generateForConference`, currently synchronous and O(registrations ×
certificate types) — fine for a small conference, not for one with
thousands of registrations) as a background job instead of a blocking
HTTP request.

**Exit condition:** issuing a certificate for a large seeded conference
(hundreds of registrations) doesn't time out an HTTP request, and the
resulting certificate has a real downloadable PDF.

---

## Backend changes required first

1. `CertificatesController.generateForConference` currently calls
   `CertificatesService.generateForConference` inline and returns the
   created rows. For a large conference this is the kind of "expensive
   work in the request path" SRS §31 explicitly forbids. Change: the
   endpoint enqueues a job onto `QUEUE_NAMES.CERTIFICATE_PDF` (reused
   queue, different job name — `run-eligibility-sweep`) with
   `{ organizationId, conferenceId }` and returns `202 Accepted`
   immediately, mirroring the `ExportsController`/`ImportsController`
   pattern exactly (same `202` + poll-a-job-status shape — this phase
   should probably introduce a small `CertificateGenerationJob` tracking
   row, or reuse the `ExportJob`-style status pattern, rather than
   inventing a third status-polling shape for the same underlying idea).
2. `CertificatesService.issue` enqueues `render-certificate-pdf` with
   `{ certificateId }` after flipping status to `ISSUED` — same shape as
   the invoice job.

## Job payload & processor contracts

- `run-eligibility-sweep`: `{ organizationId, conferenceId }`. Processor
  runs the same logic as today's `generateForConference` (loop
  registrations × the six certificate types, check existing rows, call
  `CertificateEligibilityService.isEligible`, create `ELIGIBLE` rows) —
  this is a case where the logic itself doesn't change, only where it
  runs; consider whether the six eligibility checks
  (`certificate-eligibility.service.ts`) are cheap enough to duplicate as
  plain Prisma queries in the worker, or whether it's worth extracting
  them into a location both processes can import — same trade-off as
  `worker/03`'s overdue-sweep query, decide per actual query complexity
  once looking at `certificate-eligibility.service.ts` directly.
- `render-certificate-pdf`: `{ certificateId }`. Idempotency guard:
  no-op if `fileId` is already set (same pattern as invoices). Renders a
  PDF containing at minimum the fields the public verification endpoint
  already exposes (`certificateNumber`, holder name per the
  full-name/initial setting, `conferenceName`, `certificateType`,
  `issuedAt`) plus a QR code encoding the verification URL
  (`/verify/:code` from the frontend plan) so a printed certificate is
  independently checkable — SRS §17/§18's badge/certificate sections
  both lean on QR as the standard verification mechanism, reuse whatever
  QR-generation approach the check-in flow's `qrCode` values already use
  server-side (`apps/api/src/common/utils/qr-code.util.ts`) for
  consistency, even though that util generates opaque codes rather than
  a scannable image — the certificate PDF needs an actual QR *image*
  (a small `qrcode` npm package rendering to PNG/SVG), which is a
  different concern from generating the opaque string value; don't
  conflate the two.

## Testing focus

- Unit: idempotency guard on `render-certificate-pdf`; eligibility sweep
  correctly skips registration/type pairs that already have a
  `Certificate` row (mirrors the existing unit test already covering
  this in `CertificatesService.generateForConference`'s spec — the
  worker's version of the same logic needs the same coverage,
  duplicated or shared depending on the extraction decision above).
- Load-adjacent: seed a conference with a few hundred registrations,
  confirm the eligibility sweep completes well within the job's retry
  timeout and doesn't need `attempts > 1` under normal conditions (if it
  does, the sweep itself needs batching, not just backgrounding).

## Definition of Done

- [ ] `POST conferences/:conferenceId/certificates/generate` returns
  `202` and a job/status handle instead of blocking.
- [ ] `docs/plans/frontend/05-program-checkin-certificates.md`'s
  `<CertificateGenerationPanel>` is updated to poll rather than await —
  note this as a required frontend-plan follow-up once this backend
  change ships, since the frontend plan was written against the
  synchronous version.
- [ ] Rendered certificate PDFs contain a scannable QR encoding the
  correct `/verify/:code` URL — verified by actually scanning one, not
  just checking the encoded string matches.

## Explicitly deferred

- Certificate template customization per organization/conference — one
  fixed layout to start, same reasoning as invoices.
- Bulk re-issue / revoke-and-regenerate flow beyond the existing
  `REVOKED` status value — no UI or job currently transitions a
  certificate to `REVOKED`; out of scope until a concrete requirement
  exists.

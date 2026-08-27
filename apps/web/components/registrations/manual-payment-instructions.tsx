/**
 * `ConferenceSetting.manualPaymentInstructions` now exists and is
 * settable by organizers (see `<ConferenceSettingsForm>`), but `GET
 * conferences/:conferenceId/settings` still requires an active
 * organization membership — a registrant filling out checkout has none,
 * so there is still no way to fetch the real text from this no-org-context
 * flow. This renders whatever text is passed in, defaulting to a generic
 * fallback, so wiring the real value through is a one-line change at the
 * call site once a no-org-context read exists.
 */
export function ManualPaymentInstructions({ instructions }: { instructions?: string }) {
  return (
    <div className="rounded-lg border p-4 text-sm">
      <h3 className="font-semibold">Manual payment</h3>
      <p className="mt-1 text-muted-foreground">
        {instructions ?? 'Contact the organizer for bank transfer or cheque instructions — this conference has not configured payment instructions text yet.'}
      </p>
    </div>
  );
}

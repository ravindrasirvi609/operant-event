/**
 * Deliberately its own minimal layout — SRS §35's "large touch targets,
 * fast search" requirement is incompatible with the org-switcher sidebar
 * shell. Full-bleed, no chrome beyond what the scanner itself needs.
 * Still runs through the same httpOnly-cookie auth as every other
 * `(dashboard)` page — this is a staff-facing, authenticated route
 * (`CHECKIN_MANAGE`), not a public one.
 */
export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

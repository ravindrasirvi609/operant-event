export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-3">
        <span className="text-sm font-semibold">Operant Event</span>
      </header>
      <main className="flex flex-1">{children}</main>
    </div>
  );
}

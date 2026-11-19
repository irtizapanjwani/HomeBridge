// Shown the moment the admin page is opened, while the server reads the applications, members and
// log from the database, so the officer sees the back office straight away instead of a blank tab.
export default function AdminLoading() {
  const bar = "rounded-xl bg-black/[0.06] animate-pulse";
  return (
    <div className="flex min-h-screen bg-admin-bg" aria-busy="true" aria-label="Loading the back office">
      <div className="hidden w-[272px] shrink-0 bg-forest-900 px-4 py-6 lg:block">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />
        <div className="mt-10 flex flex-col gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      </div>
      <main className="flex-1 px-[clamp(16px,3vw,32px)] py-6">
        <div className={`h-9 w-64 ${bar}`} />
        <div className={`mt-3 h-4 w-96 max-w-full ${bar}`} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-24 ${bar}`} />
          ))}
        </div>
        <div className={`mt-6 h-[420px] ${bar}`} />
      </main>
    </div>
  );
}

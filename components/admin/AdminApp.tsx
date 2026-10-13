"use client";

import { useEffect, useState } from "react";
import { PENDING_APP, ROLES, type ScreenId } from "@/lib/admin-data";
import { LockIcon, MenuIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";
import { AdminStoreProvider, useAdmin } from "./store";
import { NoAccess, cx } from "./ui";
import { RegisterScreen } from "./screens/Register";
import { MemberProfile } from "./screens/MemberProfile";
import { ContributionsScreen } from "./screens/Contributions";
import { ApplicationsScreen } from "./screens/Applications";
import { JoiningFeesScreen } from "./screens/JoiningFees";
import { WithdrawalsScreen } from "./screens/Withdrawals";
import { MeetingsScreen } from "./screens/Meetings";
import { ProjectsScreen } from "./screens/Projects";
import { ReportsScreen } from "./screens/Reports";
import { AuditLogScreen } from "./screens/AuditLog";
import { SettingsScreen } from "./screens/Settings";

const NAV: { id: ScreenId; label: string; what: string; group: 1 | 2 }[] = [
  { id: "register", label: "Member register", what: "the member register or share accounts", group: 1 },
  { id: "contributions", label: "Contributions", what: "share contributions or bank statements", group: 1 },
  { id: "applications", label: "Applications", what: "the applications queue", group: 1 },
  { id: "fees", label: "Joining fees (VEKAT)", what: "joining-fee payments", group: 2 },
  { id: "withdrawals", label: "Withdrawals", what: "withdrawal requests", group: 2 },
  { id: "meetings", label: "Meetings and votes", what: "meetings and votes", group: 2 },
  { id: "projects", label: "Projects and portfolio", what: "projects and the portfolio", group: 2 },
  { id: "reports", label: "Reports and exports", what: "reports", group: 2 },
  { id: "audit", label: "Audit log", what: "the audit log", group: 2 },
  { id: "settings", label: "Settings", what: "settings", group: 2 },
];

export function AdminApp() {
  return (
    <AdminStoreProvider>
      <Shell />
    </AdminStoreProvider>
  );
}

function Shell() {
  const s = useAdmin();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const counts: Partial<Record<ScreenId, number>> = {
    contributions: s.lines.filter((l) => l.matchStatus === "Suspense").length,
    applications: s.apps.filter((a) => PENDING_APP.includes(a.status)).length,
  };

  const current = NAV.find((n) => n.id === s.screen)!;
  const roleLine = `${s.role.title} · ${s.role.heldBy}`;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-2">
        <LogoMark size={36} />
        <div className="min-w-0">
          <div className="truncate font-display text-[18px] leading-tight font-bold text-cream">HomeBridge Admin</div>
          <div className="mt-0.5 truncate text-[12.5px] text-[#A9B5AD]">{roleLine}</div>
        </div>
      </div>

      <nav aria-label="Admin sections" className="mt-6 flex flex-col gap-1">
        {NAV.map((n, i) => {
          const on = s.screen === n.id;
          const locked = s.access(n.id) === "none";
          const count = locked ? 0 : counts[n.id] ?? 0;
          return (
            <div key={n.id} className="contents">
              {i > 0 && NAV[i - 1].group !== n.group ? <hr className="mx-2 my-3 border-0 border-t border-white/12" /> : null}
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => {
                  s.go(n.id);
                  setNavOpen(false);
                }}
                className={cx(
                  "flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-left text-[15px] transition",
                  on ? "bg-gold font-semibold text-forest-950" : n.group === 1 ? "text-cream hover:bg-white/6" : "text-[#D8D3BC] hover:bg-white/6",
                )}
              >
                <span className="min-w-0 truncate">{n.label}</span>
                {locked ? (
                  <LockIcon size={15} aria-label="No access" className={on ? "text-forest-900" : "text-[#7F8F86]"} />
                ) : count > 0 ? (
                  <span
                    className={cx(
                      "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-bold",
                      on ? "bg-forest-900 text-cream" : "bg-cream text-forest-900",
                    )}
                    aria-label={`${count} waiting`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-8">
        <label htmlFor="role-switch" className="block text-[12px] font-semibold tracking-[0.08em] text-[#A9B5AD] uppercase">
          Signed in as
        </label>
        <select
          id="role-switch"
          value={s.role.id}
          onChange={(e) => s.setRoleId(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-forest-800 px-2.5 text-[14px] font-semibold text-cream focus:border-gold focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} · {r.heldBy}
            </option>
          ))}
        </select>
        <p className="m-0 mt-2 text-[12px] leading-snug text-[#A9B5AD]">{s.role.summary}</p>
        <p className="m-0 mt-2 text-[11.5px] text-[#7F8F86]">Two-factor on · demo role switcher</p>
      </div>
    </div>
  );

  const access = s.access(s.screen);

  return (
    <div className="flex min-h-screen bg-admin-bg text-[15px] text-body">
      <div className="hidden w-[272px] shrink-0 bg-forest-900 lg:block">
        <aside className="dark-scroll sticky top-0 h-screen overflow-y-auto px-4 py-6">{sidebar}</aside>
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" onClick={() => setNavOpen(false)} className="absolute inset-0 bg-forest-950/60" />
          <aside className="dark-scroll relative h-full w-[min(86vw,300px)] overflow-y-auto bg-forest-900 px-4 py-6">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open admin menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-forest-800"
          >
            <MenuIcon size={22} />
          </button>
          <div className="min-w-0">
            <div className="font-display text-[17px] leading-tight font-bold text-forest-800">HomeBridge Admin</div>
            <div className="truncate text-[12px] text-muted">{roleLine}</div>
          </div>
        </header>

        <main className="flex w-full max-w-[1280px] min-w-0 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {access === "none" ? (
            <>
              <h1 className="m-0 font-display text-[clamp(26px,3vw,34px)] font-bold text-forest-800">{current.label}</h1>
              <NoAccess role={`The ${s.role.title} role`} what={current.what} />
            </>
          ) : (
            <Screen id={s.screen} />
          )}
        </main>
      </div>

      {s.profileNo ? <MemberProfile /> : null}
    </div>
  );
}

function Screen({ id }: { id: ScreenId }) {
  switch (id) {
    case "register":
      return <RegisterScreen />;
    case "contributions":
      return <ContributionsScreen />;
    case "applications":
      return <ApplicationsScreen />;
    case "fees":
      return <JoiningFeesScreen />;
    case "withdrawals":
      return <WithdrawalsScreen />;
    case "meetings":
      return <MeetingsScreen />;
    case "projects":
      return <ProjectsScreen />;
    case "reports":
      return <ReportsScreen />;
    case "audit":
      return <AuditLogScreen />;
    case "settings":
      return <SettingsScreen />;
  }
}

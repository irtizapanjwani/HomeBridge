"use client";

import { FIVE_CHECKS, PROJECTS } from "@/lib/content";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon } from "@/components/ui/Icons";
import { useAdmin } from "../store";
import { naira } from "../lib";
import { Banner, Btn, Card, CardTitle, Empty, PageHeader, Pill, ReadOnly, StatTile, cx } from "../ui";

export function ProjectsScreen() {
  const s = useAdmin();
  const toast = useToast();
  const board = s.can("projects.checks");
  const funds = s.txs.reduce((t, x) => t + x.ngnValue, 0);
  const policyApproved = false;

  function toggle(pid: string, k: number) {
    const p = s.projects.find((x) => x.id === pid)!;
    const next = p.checks.map((c, j) => (j === k ? !c : c));
    s.setProjects((cur) => cur.map((x) => (x.id === pid ? { ...x, checks: next } : x)));
    const title = PROJECTS.find((x) => x.art === pid)?.title ?? pid;
    s.addLog(next[k] ? "Marked check passed" : "Marked check not passed", `${title} · ${FIVE_CHECKS[k][0]}`, p.checks[k] ? "Passed" : "Not passed", next[k] ? "Passed" : "Not passed");
    toast(`${title}: “${FIVE_CHECKS[k][0]}” ${next[k] ? "passed" : "reopened"} — ${next.filter(Boolean).length} of 5.`);
  }

  return (
    <>
      <PageHeader title="Projects and portfolio" subtitle="Five checks before any money (14.5) · monthly reports (15.3) · portfolio rules (13A)" />
      {!board ? <ReadOnly why={`${s.role.title} can follow every project. The Board records the five checks.`} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Businesses — at least 75%" value={naira(Math.round(funds * 0.75))} sub="Released in stages against milestones (13.1)" />
        <StatTile label="Withdrawal reserve — 15%" value={naira(Math.round(funds * 0.15))} sub="Pays withdrawals in notice order (12.2)" />
        <StatTile label="Running costs — at most 10%" value={naira(Math.round(funds * 0.1))} sub={`Of ${naira(funds)} share capital`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PROJECTS.map((p) => {
          const st = s.projects.find((x) => x.id === p.art)!;
          const passed = st.checks.filter(Boolean).length;
          return (
            <Card key={p.art} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="m-0 font-display text-[19px] font-bold text-forest-800">{p.title}</h2>
                  <p className="m-0 text-[13px] text-muted">{p.place}</p>
                </div>
                <Pill tone={passed === 5 ? "green" : passed ? "warm" : "grey"}>{`${passed} of 5 checks`}</Pill>
              </div>
              <p className="m-0 text-[14px]">{p.text}</p>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {FIVE_CHECKS.map(([name, detail], k) => (
                  <li key={name}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={st.checks[k]}
                      aria-disabled={!board || undefined}
                      title={board ? `${name}: ${detail}` : "Only the Board records the five checks."}
                      onClick={() => (board ? toggle(p.art, k) : toast("Only the Board records the five checks.", "warn"))}
                      className={cx(
                        "flex w-full items-start gap-2.5 rounded-[10px] border px-3 py-2 text-left text-[13.5px] transition",
                        st.checks[k] ? "border-[#CFE0D3] bg-mist" : "border-line/80 bg-paper hover:bg-[#FBF8EE]",
                        !board && "cursor-default",
                      )}
                    >
                      <span className={cx("mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border", st.checks[k] ? "border-forest-800 bg-forest-800 text-cream" : "border-[#B8AC86] bg-paper")}>
                        {st.checks[k] ? <CheckIcon size={13} /> : null}
                      </span>
                      <span>
                        <b className="font-semibold text-ink">{name}</b> <span className="text-muted">— {detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2 border-t border-line/80 pt-3 text-[13.5px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Monthly report</span>
                  <Pill tone="grey">{st.report}</Pill>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    size="sm"
                    variant="primary"
                    reason={
                      passed < 5
                        ? `Blocked: ${passed} of 5 checks passed. No money is invested until all five pass (14.5).`
                        : "All five checks passed. Releases are prepared by the manager and need two signatories within the 14.3 limits — outside this sample."
                    }
                  >
                    Release first stage
                  </Btn>
                  <Btn size="sm" reason="No money invested yet — the first monthly report is due the month after the first release (15.3).">
                    Publish report
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <CardTitle aside={<Pill tone="warm">Investment policy not yet approved</Pill>}>Long-term portfolio (13A)</CardTitle>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-3">
            <Empty title="No holdings.">
              The portfolio stays empty until members approve a written Investment Policy at a general meeting (13A.2). Values and holdings are then reported every quarter (13A.7).
            </Empty>
            <div>
              <Btn reason={policyApproved ? undefined : "No investment can be bought until the Investment Policy is approved (13A.2) and written advice is on file (13A.3)."}>Add holding</Btn>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Limits the system will enforce</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px]">
              <li className="flex justify-between gap-3 rounded-[10px] bg-[#FBF8EE] px-3 py-2">
                <span>Portfolio ≤ 20% of total funds</span>
                <b className="font-semibold whitespace-nowrap">max {naira(Math.round(funds * 0.2))}</b>
              </li>
              <li className="flex justify-between gap-3 rounded-[10px] bg-[#FBF8EE] px-3 py-2">
                <span>≤ 10% of the portfolio in any one company</span>
                <b className="font-semibold whitespace-nowrap">max {naira(Math.round(funds * 0.02))}</b>
              </li>
              <li className="rounded-[10px] bg-[#FBF8EE] px-3 py-2">Withdrawal and statutory reserves, and joining fees, are never used (13A.4c)</li>
              <li className="rounded-[10px] bg-[#FBF8EE] px-3 py-2">No borrowing, derivatives, FX trading or crypto; held for 3+ years (13A.4d–e)</li>
            </ul>
          </div>
        </div>
        <Banner tone="info">Figures are worked out from current share capital ({naira(funds)}). They are settings an AGM can change without code.</Banner>
      </Card>
    </>
  );
}

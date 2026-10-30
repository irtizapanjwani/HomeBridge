"use client";

import { useState } from "react";
import { ROLES, type PendingChange, type SettingsState } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { useAdmin, type Store } from "../store";
import { naira, nowStamp } from "../lib";
import { Banner, Btn, Card, CardTitle, Empty, Pill, PageHeader, ReadOnly, Table, Td, Th, cx, inputCls } from "../ui";
import { EmailTemplatesCard, FormsRemindersCard, WelcomeAutoSendCard } from "./LiveSettings";

type Kind = "bank" | "fee" | "rule";
type FieldDef = { key: string; label: string; kind: Kind; get: (s: SettingsState) => string | number; show?: (v: string) => string; numeric?: { min: number; max: number; int?: boolean } };

const BANK_KEYS = ["NGN", "USD", "GBP"] as const;

const bankFields = (c: (typeof BANK_KEYS)[number]): FieldDef[] => [
  { key: `banks.${c}.bank`, label: "Bank", kind: "bank", get: (s) => s.banks[c].bank },
  { key: `banks.${c}.accountName`, label: "Account name", kind: "bank", get: (s) => s.banks[c].accountName },
  { key: `banks.${c}.accountNumber`, label: "Account number", kind: "bank", get: (s) => s.banks[c].accountNumber },
  ...(c === "NGN" ? [] : [{ key: `banks.${c}.swift`, label: "SWIFT / BIC", kind: "bank" as const, get: (s: SettingsState) => s.banks[c].swift ?? "" }]),
];

const FEE_FIELDS: FieldDef[] = [
  { key: "joiningFeeNgn", label: "Joining fee — Nigeria", kind: "fee", get: (s) => s.joiningFeeNgn, show: (v) => naira(Number(v)), numeric: { min: 0, max: 1_000_000, int: true } },
  { key: "joiningFeeGbp", label: "Joining fee — abroad", kind: "fee", get: (s) => s.joiningFeeGbp, show: (v) => `£${v}`, numeric: { min: 0, max: 1_000 } },
  { key: "joiningFeePayee", label: "Payee (a setting, not hard-coded — 6.3)", kind: "fee", get: (s) => s.joiningFeePayee },
];

const RULE_FIELDS: FieldDef[] = [
  { key: "sharePrice", label: "Share price (11.1)", kind: "rule", get: (s) => s.sharePrice, show: (v) => naira(Number(v)), numeric: { min: 1, max: 1_000_000, int: true } },
  { key: "minMonthlyNgn", label: "Minimum monthly — home (11.2)", kind: "rule", get: (s) => s.minMonthlyNgn, show: (v) => naira(Number(v)), numeric: { min: 0, max: 10_000_000, int: true } },
  { key: "minMonthlyGbp", label: "Minimum monthly — diaspora (11.2)", kind: "rule", get: (s) => s.minMonthlyGbp, show: (v) => `£${v}`, numeric: { min: 0, max: 100_000 } },
  { key: "foundingBlockNgn", label: "Founding block — naira (5.4)", kind: "rule", get: (s) => s.foundingBlockNgn, show: (v) => naira(Number(v)), numeric: { min: 0, max: 1_000_000_000, int: true } },
  { key: "foundingBlockGbp", label: "Founding block — pounds (5.4)", kind: "rule", get: (s) => s.foundingBlockGbp, show: (v) => `£${Number(v).toLocaleString("en-GB")}`, numeric: { min: 0, max: 1_000_000 } },
  { key: "capPct", label: "Maximum holding (11.3)", kind: "rule", get: (s) => s.capPct, show: (v) => `${v}% of share capital`, numeric: { min: 1, max: 100 } },
  { key: "maxProxies", label: "Maximum proxies per holder (16.4)", kind: "rule", get: (s) => s.maxProxies, show: (v) => `${v}`, numeric: { min: 0, max: 50, int: true } },
];

const ALL_FIELDS = [...BANK_KEYS.flatMap(bankFields), ...FEE_FIELDS, ...RULE_FIELDS];

function applySetting(s: Store, key: string, value: string) {
  if (key.startsWith("user.")) {
    const id = key.split(".")[1];
    s.setStaff((cur) => cur.map((u) => (u.id === id ? { ...u, role: value } : u)));
    return;
  }
  if (key.startsWith("banks.")) {
    const [, c, f] = key.split(".") as [string, "NGN" | "USD" | "GBP", string];
    s.setSettings((cur) => ({ ...cur, banks: { ...cur.banks, [c]: { ...cur.banks[c], [f]: value } } }));
    return;
  }
  const def = ALL_FIELDS.find((d) => d.key === key);
  s.setSettings((cur) => ({ ...cur, [key]: def?.numeric ? Number(value) : value }));
}

let chSeq = 20;

export function SettingsScreen() {
  const s = useAdmin();
  const toast = useToast();
  const pendingList = s.pending.filter((p) => p.status === "Pending");
  const history = s.pending.filter((p) => p.status !== "Pending");
  const anyEdit = s.can("settings.propose") || s.can("settings.approve");

  function propose(key: string, label: string, before: string, after: string, value?: string) {
    const ch: PendingChange = { id: `CH-${String(chSeq++).padStart(4, "0")}`, key, label, before, after, value, maker: s.role.person, makerRole: s.role.title, at: nowStamp(), status: "Pending" };
    s.setPending((cur) => [ch, ...cur]);
    s.addLog("Proposed setting change", key, before, `${after} (pending second approval)`);
    toast(`Change proposed. A second admin must approve it before it takes effect.`);
  }

  function decide(p: PendingChange, ok: boolean) {
    s.setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: ok ? "Approved" : "Rejected", checker: s.role.person } : x)));
    if (ok) applySetting(s, p.key, p.value ?? p.after);
    s.addLog(ok ? "Approved setting change (second approver)" : "Rejected setting change", p.key, p.before, ok ? p.after : `${p.before} (unchanged)`);
    toast(ok ? `${p.label} updated. Maker ${p.maker}, checker ${s.role.person}.` : `${p.label}: change rejected, nothing changed.`);
  }

  function withdraw(p: PendingChange) {
    s.setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: "Withdrawn" } : x)));
    s.addLog("Withdrew own setting change", p.key, `${p.after} (pending)`, "Withdrawn");
    toast("Your proposed change was withdrawn.");
  }

  const approveReason = (p: PendingChange) =>
    !s.can("settings.approve")
      ? "Only a second Super admin or the Treasurer / Chairman approves settings changes."
      : p.maker === s.role.person
        ? "You proposed this change. A second admin must approve it — the same person cannot make and approve a change (maker-checker)."
        : undefined;

  return (
    <>
      <PageHeader title="Settings" subtitle="Every change needs a second approver · values marked as settings can be changed by the AGM without code" />
      {!anyEdit ? <ReadOnly why={`${s.role.title} can see settings and pending changes but cannot propose or approve them.`} /> : null}

      <WelcomeAutoSendCard />
      <FormsRemindersCard />
      <EmailTemplatesCard />

      <Card className="flex flex-col gap-3 p-5">
        <CardTitle id="pending-title" aside={<Pill tone={pendingList.length ? "warm" : "green"}>{pendingList.length ? `${pendingList.length} waiting` : "Nothing waiting"}</Pill>}>
          Pending changes
        </CardTitle>
        {pendingList.length === 0 ? (
          <Empty title="No changes waiting for a second approver." />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-labelledby="pending-title">
            {pendingList.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-[14px] border border-[#EBD38B] bg-[#FFFBEF] p-4 lg:flex-row lg:items-center lg:justify-between" data-change={p.id}>
                <div className="min-w-0 text-[14px]">
                  <b className="font-semibold text-ink">{p.label}</b>
                  <div className="mt-0.5 break-words">
                    <span className="text-muted line-through decoration-[#B8AC86]">{p.before}</span> → <b className="font-semibold text-forest-800">{p.after}</b>
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {p.id} · proposed by {p.maker} ({p.makerRole}) · {p.at}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Btn size="sm" variant="primary" reason={approveReason(p)} onClick={() => decide(p, true)}>
                    Approve
                  </Btn>
                  <Btn size="sm" variant="danger" reason={!s.can("settings.approve") ? "Only a second Super admin or the Treasurer / Chairman can reject." : p.maker === s.role.person ? "Withdraw your own change instead." : undefined} onClick={() => decide(p, false)}>
                    Reject
                  </Btn>
                  {p.maker === s.role.person ? (
                    <Btn size="sm" variant="ghost" onClick={() => withdraw(p)}>
                      Withdraw
                    </Btn>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {history.length ? (
          <details className="text-[13.5px]">
            <summary className="cursor-pointer font-semibold text-forest-800">Decided changes ({history.length})</summary>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
              {history.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <Pill>{p.status}</Pill>
                  <span>
                    {p.label}: {p.before} → {p.after} · maker {p.maker}
                    {p.checker ? ` · checker ${p.checker}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Card>

      <section aria-labelledby="banks-title" className="flex flex-col gap-3">
        <h2 id="banks-title" className="m-0 font-display text-[21px] font-bold text-forest-800">
          Society bank accounts (14.1)
        </h2>
        {s.role.id === "finance" ? (
          <Banner tone="lock" title="Finance officers cannot change bank details.">
            Bank details are changed only by a Super admin, with a second approver (brief p.9 and p.12).
          </Banner>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {BANK_KEYS.map((c) => (
            <Card key={c} className="flex flex-col gap-1 p-5">
              <CardTitle aside={<Pill tone="grey">{c}</Pill>}>{s.settings.banks[c].label}</CardTitle>
              <div className="mt-1 flex flex-col">
                {bankFields(c).map((f) => (
                  <SettingRow key={f.key} def={f} onPropose={propose} stacked />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-1 p-5">
          <CardTitle aside={<Pill tone="blue">Paid to VEKAT</Pill>}>Joining fee (6.3)</CardTitle>
          <p className="m-0 mb-1 text-[13.5px] text-muted">Not share capital, never refunded. The AGM may change the amount; the payee is a setting.</p>
          {FEE_FIELDS.map((f) => (
            <SettingRow key={f.key} def={f} onPropose={propose} />
          ))}
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <CardTitle>Shares and membership rules</CardTitle>
          <p className="m-0 mb-1 text-[13.5px] text-muted">Record the AGM’s decision here; it takes effect after a second approver.</p>
          {RULE_FIELDS.map((f) => (
            <SettingRow key={f.key} def={f} onPropose={propose} />
          ))}
        </Card>
      </div>

      <UsersCard onPropose={propose} />
    </>
  );
}

function SettingRow({ def, onPropose, stacked }: { def: FieldDef; onPropose: (key: string, label: string, before: string, after: string, value?: string) => void; stacked?: boolean }) {
  const s = useAdmin();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const current = String(def.get(s.settings));
  const [val, setVal] = useState(current);
  const pending = s.pending.some((p) => p.key === def.key && p.status === "Pending");
  const show = def.show ?? ((v: string) => v);
  const fullLabel = def.kind === "bank" ? `${s.settings.banks[def.key.split(".")[1] as "NGN"].label} — ${def.label.toLowerCase()}` : def.label;

  const reason =
    def.kind === "rule"
      ? !s.can("settings.propose")
        ? "Only a Super admin or the Finance officer can propose rule changes."
        : undefined
      : !s.can("settings.proposeBank")
        ? s.role.id === "finance"
          ? def.kind === "bank"
            ? "Finance officers cannot change bank details."
            : "Fees are changed by a Super admin, with a second approver."
          : "Only a Super admin can propose bank-detail and fee changes."
        : undefined;

  function save() {
    const v = val.trim();
    if (!v) return toast("Enter a value.", "warn");
    if (def.numeric) {
      const n = Number(v.replace(/,/g, ""));
      if (!Number.isFinite(n) || n < def.numeric.min || n > def.numeric.max || (def.numeric.int && !Number.isInteger(n)))
        return toast(`Enter ${def.numeric.int ? "a whole number" : "a number"} between ${def.numeric.min} and ${def.numeric.max.toLocaleString("en-GB")}.`, "warn");
      if (String(n) === current) return toast("That is the current value.", "warn");
      onPropose(def.key, fullLabel, show(current), show(String(n)), String(n));
    } else {
      if (v === current) return toast("That is the current value.", "warn");
      onPropose(def.key, fullLabel, current, v);
    }
    setEditing(false);
  }

  return (
    <div className={cx("flex gap-x-3 gap-y-1.5 border-b border-line/70 py-2.5 last:border-0", stacked ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between")}>
      <div className="min-w-0">
        <div className="text-[12.5px] text-muted">{def.label}</div>
        {!editing ? <div className="text-[14.5px] font-medium break-words text-ink">{show(current)}</div> : null}
      </div>
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <input value={val} onChange={(e) => setVal(e.target.value)} aria-label={`New value for ${fullLabel}`} className={cx(inputCls, "h-10! w-full sm:w-56")} />
          <Btn size="sm" variant="primary" onClick={save}>
            Propose
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Btn>
        </div>
      ) : pending ? (
        <span className="self-start sm:self-auto">
          <Pill tone="warm">Change pending</Pill>
        </span>
      ) : (
        <Btn
          size="sm"
          variant="ghost"
          className={cx("self-start px-2", !stacked && "sm:self-auto")}
          reason={reason}
          onClick={() => {
            setVal(current);
            setEditing(true);
          }}
          aria-label={`Propose change to ${fullLabel}`}
        >
          Propose change
        </Btn>
      )}
    </div>
  );
}

function UsersCard({ onPropose }: { onPropose: (key: string, label: string, before: string, after: string, value?: string) => void }) {
  const s = useAdmin();
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const titles = Array.from(new Set(ROLES.map((r) => r.title)));
  const reason = s.can("users.manage") ? undefined : "Only a Super admin manages users and roles.";

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle>Admin users and roles</CardTitle>
      <Table minWidth={680} label="Admin users">
        <thead>
          <tr>
            <Th>Person</Th>
            <Th>Role</Th>
            <Th>Held by</Th>
            <Th>Two-factor</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {s.staff.map((u) => {
            const key = `user.${u.id}.role`;
            const pending = s.pending.some((p) => p.key === key && p.status === "Pending");
            return (
              <tr key={u.id}>
                <Td className="font-semibold text-ink">{u.name}</Td>
                <Td>
                  {editing === u.id ? (
                    <select value={val} onChange={(e) => setVal(e.target.value)} className={cx(inputCls, "h-10! w-52")} aria-label={`New role for ${u.name}`}>
                      {titles.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    u.role
                  )}
                </Td>
                <Td>{u.heldBy}</Td>
                <Td>{u.twoFactor ? <Pill tone="green">On</Pill> : <Pill tone="red">Off</Pill>}</Td>
                <Td>
                  {editing === u.id ? (
                    <span className="flex gap-1.5">
                      <Btn
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (val !== u.role) onPropose(key, `Role of ${u.name}`, u.role, val);
                          setEditing(null);
                        }}
                      >
                        Propose
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Btn>
                    </span>
                  ) : pending ? (
                    <Pill tone="warm">Change pending</Pill>
                  ) : (
                    <Btn
                      size="sm"
                      variant="ghost"
                      reason={reason ?? (u.name === s.role.person ? "You cannot change your own role." : undefined)}
                      onClick={() => {
                        setVal(u.role);
                        setEditing(u.id);
                      }}
                    >
                      Change role
                    </Btn>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="m-0 text-[13px] text-muted">Role changes also need a second approver. All admins use two-factor sign-in (TOTP).</p>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, CheckIcon, DownloadIcon, FileIcon, LockIcon, MailIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/content";
import type { AccountView } from "./Account";
import { Card } from "./bits";
import { ContactEditor } from "./Membership";
import { GreenPanel, PortalPage } from "./PortalPage";

const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-gold text-forest-900",
  Declined: "bg-cream/15 text-cream",
};
const DOWNLOADABLE = new Set(["declaration", "nominee_form"]);

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="m-0 text-[15.5px] break-words text-ink">{value}</dd>
    </div>
  );
}

/** Profile for members and applicants: who they are, their details, nominees, documents and sign-in. */
export function ProfilePage({ view }: { view: AccountView }) {
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const m = view.membership;
  const initials = view.fullName
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(mr|mrs|ms|miss|dr|prof|chief)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const status = m ? "Approved" : view.status;
  const nomineesTotal = view.nominees.reduce((t, n) => t + (Number(n.share) || 0), 0);

  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/member/login", { method: "DELETE" }).catch(() => null);
    window.location.href = "/";
  };

  return (
    <PortalPage>
      {/* Who you are */}
      <GreenPanel>
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-gold font-display text-[30px] font-bold text-forest-900 ring-4 ring-gold/25">
            {initials || "•"}
          </span>
          <div className="min-w-[min(100%,240px)] flex-1">
            <p className="m-0 text-[12px] font-bold tracking-[0.14em] text-gold uppercase">{m ? "Member profile" : "Your profile"}</p>
            <h1 className="m-0 mt-1 text-[clamp(28px,3.8vw,40px)] leading-tight break-words text-cream">{view.fullName}</h1>
            <p className="m-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14.5px] text-on-dark">
              <span className={`rounded-full px-3 py-0.5 text-[13px] font-semibold ${STATUS_STYLE[status] ?? "bg-gold/15 text-gold ring-1 ring-gold/40"}`}>
                {m ? "Member" : status}
              </span>
              <span className="font-mono font-semibold text-cream">{m ? m.memberNo : view.reference}</span>
              {view.memberType ? <span>· {view.memberType}</span> : null}
              {view.chapter ? <span>· {view.chapter}</span> : null}
            </p>
          </div>
          <div className="w-full text-[14px] text-on-dark sm:w-auto sm:text-right">
            <p className="m-0">{m ? "Member since" : "Applied on"}</p>
            <p className="m-0 font-display text-[20px] font-bold text-cream">{m ? m.admittedAt : view.submittedAt}</p>
          </div>
        </div>
      </GreenPanel>

      {/* Both columns end level: the last card on each side stretches to the same line. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="flex flex-col gap-4 [&>:last-child]:flex-1">
          {/* Personal details */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Personal details</h2>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-[14px] font-semibold text-forest-800 hover:bg-forest-100"
                >
                  Edit phone or address
                </button>
              )}
            </div>
            <dl className="m-0 mt-2 divide-y divide-line/70">
              <Row label="Full name" value={view.fullName} />
              <Row label="Email" value={view.email} />
              <Row label="Phone / WhatsApp" value={view.whatsapp} />
              <Row label="Home address" value={[view.contact.address, view.contact.city].filter(Boolean).join(", ")} />
              <Row label="Lives in" value={view.livesIn} />
              <Row label="ID used to verify" value={view.idLabel} />
            </dl>
            {editing ? (
              <ContactEditor initial={view.contact} onDone={() => setEditing(false)} />
            ) : (
              <p className="mt-2 mb-0 text-[14px] text-muted">
                To change your name, date of birth or email,{" "}
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener" className="font-semibold">
                  message the office
                </a>
                .
              </p>
            )}
          </Card>

          {/* Nominees */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Your nominees</h2>
              {m ? (
                <Link href="/app#forms" className="inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold">
                  Update nominees <ArrowRightIcon size={15} />
                </Link>
              ) : null}
            </div>
            <p className="mt-1 mb-0 text-[14.5px] text-body">The people who receive your shares if something happens to you.</p>
            {view.nominees.length ? (
              <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                {view.nominees.map((n) => (
                  <li key={n.name} className="rounded-[16px] bg-page p-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15.5px] font-semibold text-ink">{n.name}</span>
                      <span className="font-display text-[20px] font-bold text-forest-800">{n.share}%</span>
                    </div>
                    <p className="m-0 text-[13.5px] text-muted">{n.relationship}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.min(100, Number(n.share) || 0)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 mb-0 rounded-[16px] bg-page p-4 text-[14.5px] text-body">No nominees on record yet.</p>
            )}
            {view.nominees.length && nomineesTotal !== 100 ? (
              <p className="mt-3 mb-0 text-[13.5px] font-semibold text-gold-ink">Shares add up to {nomineesTotal}% — they should make 100%.</p>
            ) : null}
          </Card>

          {/* Help */}
          <Card className="!border-butter !bg-butter/60">
            <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Something not right?</h2>
            <p className="mt-1 mb-0 text-[14.5px] text-body">The office can correct anything on your record.</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold">
                <WhatsAppIcon size={16} /> WhatsApp
              </a>
              <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold">
                <MailIcon size={16} /> {CONTACT.email}
              </a>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 [&>:last-child]:flex-1">
          {/* Membership or application */}
          {m ? (
            <Card>
              <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Membership</h2>
              <dl className="m-0 mt-2 divide-y divide-line/70">
                <Row label="Membership number" value={m.memberNo} />
                <Row label="Category" value={`${m.category} member`} />
                <Row label="Chapter" value={m.chapter} />
                <Row label="Certificate" value={m.certificateNo} />
              </dl>
              <div className="mt-3 grid gap-2">
                <a href="/api/member/certificate" target="_blank" rel="noopener" className="flex min-h-12 items-center gap-3 rounded-[14px] bg-mist/60 px-4 text-[15px] font-semibold text-forest-800 no-underline hover:bg-mist">
                  <DownloadIcon size={18} /> Membership certificate
                </a>
                {m.receiptNo ? (
                  <a href="/api/member/receipt" target="_blank" rel="noopener" className="flex min-h-12 items-center gap-3 rounded-[14px] bg-mist/60 px-4 text-[15px] font-semibold text-forest-800 no-underline hover:bg-mist">
                    <DownloadIcon size={18} /> Joining fee receipt
                  </a>
                ) : null}
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Your application</h2>
              <dl className="m-0 mt-2 divide-y divide-line/70">
                <Row label="Reference" value={view.reference} />
                <Row label="Status" value={view.status} />
                <Row label="Applied on" value={view.submittedAt} />
              </dl>
              <Link href="/app" className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold">
                Follow your application <ArrowRightIcon size={15} />
              </Link>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Documents</h2>
            {view.documents.length ? (
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {view.documents.map((d) => {
                  const canOpen = DOWNLOADABLE.has(d.type);
                  return (
                    <li key={d.id} className="flex items-center gap-3 rounded-[14px] bg-page px-3.5 py-2.5">
                      <FileIcon size={18} className="shrink-0 text-forest-800" />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[14.5px] font-semibold text-ink">{d.label}</p>
                        <p className="m-0 truncate text-[12.5px] text-muted">{d.uploadedAt}</p>
                      </div>
                      {canOpen ? (
                        <a href={`/api/member/documents/${d.id}`} target="_blank" rel="noopener" aria-label={`Download ${d.label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 hover:bg-mist">
                          <DownloadIcon size={17} />
                        </a>
                      ) : (
                        <CheckIcon size={16} strokeWidth={3} className="shrink-0 text-forest-700" aria-label="Received" />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 mb-0 text-[14.5px] text-body">Nothing uploaded yet.</p>
            )}
            <p className="mt-3 mb-0 text-[12.5px] text-muted">ID photos are kept private and are never sent back out, even to you.</p>
          </Card>

          {/* Sign-in */}
          <Card>
            <h2 className="m-0 flex items-center gap-2 font-sans text-[18px] font-semibold text-ink">
              <LockIcon size={17} className="text-forest-800" /> Sign-in and security
            </h2>
            <p className="mt-2 mb-0 text-[14.5px] text-body">
              You sign in with <span className="font-semibold text-ink">{view.email || "your email"}</span> and your password, or with a code we email you.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href="/forgot" className="inline-flex min-h-11 items-center rounded-full border border-forest-800 px-5 text-[14.5px] font-semibold text-forest-800 no-underline hover:bg-mist">
                Change password
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="inline-flex min-h-11 items-center rounded-full bg-forest-800 px-5 text-[14.5px] font-semibold text-cream hover:bg-forest-900 disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </Card>

        </div>
      </div>
    </PortalPage>
  );
}

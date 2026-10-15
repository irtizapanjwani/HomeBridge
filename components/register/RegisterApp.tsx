"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CONTACT } from "@/lib/content";
import { SHARE_PRICE_NGN } from "@/lib/settings";
import {
  STEP_LABELS,
  emptyDraft,
  feeFor,
  firstInvalidStep,
  flowFor,
  validateStep,
  type Draft,
  type Errors,
  type StepId,
} from "@/lib/register-data";
import { AboutStep, AccountStep, IdentityStep, JoinStep, NomineeStep, ReviewStep, SupporterStep } from "./Steps";
import { ProgressBar, StepList, ChoicesCard, PayNothingNote } from "./Sidebar";
import { DoneScreen, type Submission } from "./Done";
import { RegisterTopBar } from "./TopBar";

const DRAFT_KEY = "hb-register-draft-v1";
const DONE_KEY = "hb-register-done-v1";

const TITLES: Record<StepId, string> = { ...STEP_LABELS, supporter: "Join the Supporter list" };

function lead(step: StepId, d: Draft) {
  switch (step) {
    case "account":
      return "Choose how we reach you and set a password. These are how you sign in to your account.";
    case "about":
      return "Tell us who you are and where you live. This goes on the register of members.";
    case "join":
      return `Every membership has one vote and the same ₦${SHARE_PRICE_NGN.toLocaleString("en-GB")} share price.`;
    case "identity":
      return "Tell us which ID you will use. You don’t need to upload anything today.";
    case "nominee":
      return d.memberType === "group"
        ? "Confirm four short declarations."
        : "Choose who receives your shares if you die, then confirm four short declarations.";
    case "review":
      return "Check your answers, then send. You can still change anything.";
    case "supporter":
      return "Nothing to pay and nothing to sign. We’ll keep you in the loop.";
  }
}

type Saved = { draft: Draft; step: number; furthest: number };

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, blocked): the form still works, it just won't be kept */
  }
}

export function RegisterApp() {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [focusTick, setFocusTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [done, setDone] = useState<Submission | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const flow = flowFor(draft);
  const current = Math.min(step, flow.length - 1);
  const stepId = flow[current];
  const reached = Math.min(furthest, flow.length - 1);

  // Restore the saved draft (or a finished submission) once, on the client.
  useEffect(() => {
    const finished = readJSON<Submission>(DONE_KEY);
    const saved = readJSON<Saved>(DRAFT_KEY);
    if (finished?.reference) setDone(finished);
    else if (saved?.draft) {
      const base = emptyDraft();
      const d: Draft = { ...base, ...saved.draft, decl: { ...base.decl, ...saved.draft.decl } };
      if (!Array.isArray(d.nominees) || d.nominees.length === 0) d.nominees = base.nominees;
      d.password = "";
      d.passwordConfirm = "";
      const max = flowFor(d).length - 1;
      setDraft(d);
      // The password was deliberately not saved, so a restored draft starts at the account step.
      setStep(0);
      setFurthest(Math.max(0, Math.min(Number(saved.furthest) || 0, max)));
    }
    // Arriving from "Can I join today?" (/register?route=land): pre-select that route unless one is already chosen.
    const fromCheck = new URLSearchParams(window.location.search).get("route");
    if (!finished?.reference && (fromCheck === "lives" || fromCheck === "land" || fromCheck === "other" || fromCheck === "none")) {
      setDraft((d) => (d.route ? d : { ...d, route: fromCheck }));
    }
    setLoaded(true);
  }, []);

  // Autosave every change — except the password, which never goes to disk.
  useEffect(() => {
    if (!loaded || done) return;
    const { password: _p, passwordConfirm: _c, ...safe } = draft;
    writeJSON(DRAFT_KEY, { draft: safe as Draft, step: current, furthest: reached } satisfies Saved);
  }, [draft, current, reached, loaded, done]);

  // Move focus to the step heading and bring the card into view when the step changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    const top = (cardRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 16;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top) });
  }, [current, done]);

  // Focus the first invalid field after a failed "Save and continue".
  useEffect(() => {
    if (!focusTick) return;
    const first = Object.keys(errors)[0];
    const el = first ? document.getElementById(first) : null;
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center" });
    }
  }, [focusTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    // While errors are showing, clear the ones the change fixes (never add new ones mid-typing).
    if (Object.keys(errors).length) {
      const now = validateStep(stepId, next);
      const kept: Errors = {};
      for (const k of Object.keys(errors)) if (now[k]) kept[k] = now[k];
      setErrors(kept);
    }
  };

  const goTo = (i: number) => {
    setErrors({});
    setSendError("");
    setStep(i);
  };

  const showErrors = (errs: Errors) => {
    setErrors(errs);
    setFocusTick((t) => t + 1);
  };

  const submit = async () => {
    const bad = firstInvalidStep(draft);
    if (bad !== -1) {
      goTo(bad);
      setTimeout(() => showErrors(validateStep(flow[bad], draft)), 0);
      toast("Some answers need checking before you send.", "warn");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; step?: StepId };
      if (res.ok && data.ok && data.reference) {
        const result: Submission = {
          reference: data.reference,
          supporter: draft.route === "none",
          firstName: draft.fullName.trim().split(/\s+/)[0] ?? "",
          contact: draft.contactMethod === "email" ? draft.contact : draft.whatsapp || draft.contact,
          fee: feeFor(draft).fee,
        };
        writeJSON(DRAFT_KEY, null);
        writeJSON(DONE_KEY, result);
        setDone(result);
        return;
      }
      if (res.status === 422 && data.step && flow.includes(data.step)) {
        const i = flow.indexOf(data.step);
        goTo(i);
        setTimeout(() => showErrors(validateStep(data.step!, draft)), 0);
        toast("Some answers need checking before you send.", "warn");
        return;
      }
      throw new Error("send failed");
    } catch {
      setSendError("We couldn’t send your application just now. Your answers are saved: please try again in a moment, or WhatsApp us.");
    } finally {
      setSending(false);
    }
  };

  const next = () => {
    if (stepId === "review" || stepId === "supporter") {
      if (stepId === "supporter") {
        const errs = validateStep("supporter", draft);
        if (Object.keys(errs).length) return showErrors(errs);
      }
      void submit();
      return;
    }
    const errs = validateStep(stepId, draft);
    if (Object.keys(errs).length) return showErrors(errs);
    const to = current + 1;
    goTo(to);
    setFurthest((f) => Math.max(f, to));
  };

  const startAgain = (skipConfirm = false) => {
    if (!skipConfirm && !window.confirm("Clear your answers and start again?")) return;
    writeJSON(DRAFT_KEY, null);
    writeJSON(DONE_KEY, null);
    setDraft(emptyDraft());
    setFurthest(0);
    setDone(null);
    goTo(0);
    if (!skipConfirm) toast("Your answers have been cleared.");
  };

  if (done) {
    return (
      <>
        <RegisterTopBar saved={false} />
        <main id="main" className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
          <DoneScreen result={done} headingRef={headingRef} onNew={() => startAgain(true)} />
        </main>
      </>
    );
  }

  const errorCount = Object.keys(errors).length;
  const primaryLabel = stepId === "review" ? "Send application" : stepId === "supporter" ? "Join the Supporter list" : "Save and continue";

  return (
    <>
      <RegisterTopBar saved={loaded} />
      <main id="main" className="mx-auto w-full max-w-[1200px] px-4 pt-5 pb-14 sm:px-6 lg:pt-10">
        <div className="grid gap-5 lg:grid-cols-[272px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-7 lg:gap-y-5">
          {/* Desktop step list */}
          <nav aria-label="Application steps" className="hidden lg:block">
            <StepList flow={flow} current={current} reached={reached} onJump={goTo} />
          </nav>

          {/* Main card */}
          <div ref={cardRef} className="min-w-0 scroll-mt-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {/* Phone progress header */}
            <div className="mb-4 rounded-[20px] border border-line bg-paper px-4 py-3.5 lg:hidden">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[14px] font-semibold text-forest-800">
                  Step {current + 1} of {flow.length}
                  <span className="font-normal text-muted"> · {STEP_LABELS[stepId]}</span>
                </p>
                {current < flow.length - 1 && <p className="hidden truncate text-[13px] text-muted sm:block">Next: {STEP_LABELS[flow[current + 1]]}</p>}
              </div>
              <ProgressBar value={(current + 1) / flow.length} className="mt-2.5" />
            </div>

            <section aria-labelledby="step-title" className="rounded-[24px] border border-line bg-paper px-5 py-7 sm:px-9 sm:py-9">
              <p className="eyebrow !normal-case !tracking-normal text-[14px]">
                Step {current + 1} of {flow.length}
              </p>
              <h1 id="step-title" ref={headingRef} tabIndex={-1} className="mt-2 text-[30px] text-forest-800 outline-none sm:text-[36px]">
                {TITLES[stepId]}
              </h1>
              <p className="mt-2 text-[16px] text-body">{lead(stepId, draft)}</p>

              <div role="alert" className="empty:hidden">
                {errorCount > 0 && (
                  <p className="mt-5 rounded-2xl border border-danger/30 bg-[#fdf6f3] px-4 py-3 text-[15px] font-medium text-danger">
                    {errorCount === 1 ? "One answer needs checking." : `${errorCount} answers need checking.`} We’ve marked {errorCount === 1 ? "it" : "them"} below.
                  </p>
                )}
              </div>

              <form
                noValidate
                className="mt-7"
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                {stepId === "account" && <AccountStep draft={draft} set={set} errors={errors} />}
                {stepId === "about" && <AboutStep draft={draft} set={set} errors={errors} />}
                {stepId === "join" && <JoinStep draft={draft} set={set} errors={errors} />}
                {stepId === "identity" && <IdentityStep draft={draft} set={set} errors={errors} />}
                {stepId === "nominee" && <NomineeStep draft={draft} set={set} errors={errors} />}
                {stepId === "review" && <ReviewStep draft={draft} onEdit={goTo} />}
                {stepId === "supporter" && <SupporterStep draft={draft} set={set} errors={errors} onEdit={goTo} />}

                {sendError && (
                  <p role="alert" className="mt-6 rounded-2xl border border-danger/30 bg-[#fdf6f3] px-4 py-3 text-[15px] font-medium text-danger">
                    {sendError}{" "}
                    <a href={CONTACT.whatsapp} target="_blank" rel="noopener" className="text-danger underline">
                      WhatsApp us
                    </a>
                  </p>
                )}

                <div className="mt-9 flex flex-wrap-reverse items-center justify-between gap-3 border-t border-line pt-7">
                  {current > 0 ? (
                    <button
                      type="button"
                      onClick={() => goTo(current - 1)}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-forest-800/30 bg-paper px-7 max-[400px]:w-full text-[16px] font-semibold text-ink hover:border-forest-800"
                    >
                      Back
                    </button>
                  ) : (
                    <span className="text-[14px] text-muted">About 10 minutes</span>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-800 px-7 text-[16px] font-semibold text-cream hover:bg-forest-900 disabled:opacity-70 max-[400px]:w-full"
                  >
                    {sending ? "Sending…" : primaryLabel}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Choices summary: under the step list on desktop, after the card on phones */}
          <aside aria-label="Your choices" className="space-y-4 lg:col-start-1 lg:row-start-2">
            <ChoicesCard draft={draft} />
            <PayNothingNote supporter={draft.route === "none"} />
            <p className="px-1 text-[14px] text-muted">
              Not you, or want a fresh start?{" "}
              <button type="button" onClick={() => startAgain()} className="min-h-11 font-medium text-forest-800 underline underline-offset-[3px]">
                Start again
              </button>
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}

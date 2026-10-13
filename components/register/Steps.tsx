"use client";

import { CONTACT, HEARD_OPTIONS, ROUTE_OPTIONS } from "@/lib/content";
import { JOINING_FEE } from "@/lib/settings";
import {
  CHAPTERS,
  COUNTRIES,
  GROUP_DOC_OPTIONS,
  MEMBERSHIP_TYPES,
  NIGERIAN_STATES,
  OTHER_COUNTRY,
  STEP_LABELS,
  countryName,
  feeFor,
  idOptionsFor,
  livesInNigeria,
  newNominee,
  nomineeTotal,
  typeLabel,
  type Draft,
  type Errors,
  type StepId,
} from "@/lib/register-data";
import { CheckIcon, CloseIcon, IdIcon, LockIcon, PeopleIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Checkbox, ChoiceGroup, ErrorText, Field, Note, inputClass } from "./fields";

export type StepProps = {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: Errors;
};

const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- 1. Account ---------------- */

export function AccountStep({ draft, set, errors }: StepProps) {
  const phone = draft.contactMethod === "phone";
  return (
    <div className="space-y-6">
      <ChoiceGroup
        id="contactMethod"
        legend="How should we reach you?"
        layout="pair"
        options={[
          { value: "phone", label: "Phone (WhatsApp)", sub: "We send a code by WhatsApp or text" },
          { value: "email", label: "Email", sub: "We send a code by email" },
        ]}
        value={draft.contactMethod}
        onChange={(v) => set({ contactMethod: v as Draft["contactMethod"], contact: "" })}
      />
      <Field
        id="contact"
        label={phone ? "Phone number" : "Email address"}
        hint={phone ? "Include the country code if you live outside Nigeria, for example +44." : "Use an address you check often."}
        error={errors.contact}
      >
        {(a) => (
          <input
            {...a}
            type={phone ? "tel" : "email"}
            inputMode={phone ? "tel" : "email"}
            autoComplete={phone ? "tel" : "email"}
            placeholder={phone ? "+234 810 583 2602" : "name@example.com"}
            className={inputClass}
            value={draft.contact}
            onChange={(e) => set({ contact: e.target.value })}
          />
        )}
      </Field>
      <div className="flex gap-3 rounded-2xl border border-line bg-page px-4 py-3.5">
        <LockIcon size={22} className="mt-0.5 shrink-0 text-forest-800" />
        <div className="text-[14.5px] leading-relaxed">
          <p className="font-semibold text-ink">No password to remember.</p>
          <p className="text-body">
            Each time you sign in, we send a one-time code to this {phone ? "number" : "address"}. You type it in and you are in.
          </p>
          <p className="mt-2 inline-block rounded-full bg-butter px-3 py-1 text-[13px] font-medium text-gold-ink">
            Preview: codes are sent once accounts open.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 2. About you ---------------- */

export function AboutStep({ draft, set, errors }: StepProps) {
  const nigeria = livesInNigeria(draft);
  const emailOptional = draft.contactMethod === "email";
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="fullName" label="Full name" hint="As it appears on your ID." error={errors.fullName} className="sm:col-span-2">
        {(a) => <input {...a} type="text" autoComplete="name" className={inputClass} value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} />}
      </Field>
      <Field id="dob" label="Date of birth" hint="You need to be 18 or older to join." error={errors.dob}>
        {(a) => <input {...a} type="date" autoComplete="bday" max={today()} min="1900-01-01" className={inputClass} value={draft.dob} onChange={(e) => set({ dob: e.target.value })} />}
      </Field>
      <Field id="country" label="Country you live in" error={errors.country}>
        {(a) => (
          <select
            {...a}
            autoComplete="country-name"
            className={inputClass}
            value={draft.country}
            onChange={(e) => set({ country: e.target.value, state: e.target.value === "Nigeria" ? draft.state : "", idChoice: "" })}
          >
            <option value="">Choose a country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </Field>
      {draft.country === OTHER_COUNTRY && (
        <Field id="countryOther" label="Which country?" error={errors.countryOther}>
          {(a) => <input {...a} type="text" autoComplete="country-name" className={inputClass} value={draft.countryOther} onChange={(e) => set({ countryOther: e.target.value })} />}
        </Field>
      )}
      {nigeria && (
        <Field id="state" label="State" error={errors.state}>
          {(a) => (
            <select {...a} autoComplete="address-level1" className={inputClass} value={draft.state} onChange={(e) => set({ state: e.target.value })}>
              <option value="">Choose a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field id="city" label="Town or city" error={errors.city}>
        {(a) => <input {...a} type="text" autoComplete="address-level2" className={inputClass} value={draft.city} onChange={(e) => set({ city: e.target.value })} />}
      </Field>
      <Field id="address" label="Home address" error={errors.address} className="sm:col-span-2">
        {(a) => (
          <textarea {...a} rows={2} autoComplete="street-address" className={`${inputClass} resize-y`} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
        )}
      </Field>
      <Field id="whatsapp" label="WhatsApp number" hint="With the country code if you live abroad." error={errors.whatsapp}>
        {(a) => (
          <input
            {...a}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={inputClass}
            value={draft.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
          />
        )}
      </Field>
      <Field id="email" label="Email" optional={emailOptional} hint={emailOptional ? "We already have the one you gave in step 1." : "For your member pack and statements."} error={errors.email}>
        {(a) => (
          <input {...a} type="email" inputMode="email" autoComplete="email" className={inputClass} value={draft.email} onChange={(e) => set({ email: e.target.value })} />
        )}
      </Field>
      <Field id="occupation" label="Occupation" hint="Or say if you are retired or a student." error={errors.occupation}>
        {(a) => <input {...a} type="text" autoComplete="organization-title" className={inputClass} value={draft.occupation} onChange={(e) => set({ occupation: e.target.value })} />}
      </Field>
      <Field id="heard" label="How did you hear about us?" error={errors.heard}>
        {(a) => (
          <select {...a} className={inputClass} value={draft.heard} onChange={(e) => set({ heard: e.target.value })}>
            <option value="">Choose one</option>
            {HEARD_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id="chapter" label="Chapter" hint="The local group you would like to meet with." error={errors.chapter} className="sm:col-span-2">
        {(a) => (
          <select {...a} className={`${inputClass} sm:max-w-[calc(50%-10px)]`} value={draft.chapter} onChange={(e) => set({ chapter: e.target.value })}>
            <option value="">Choose a chapter</option>
            {CHAPTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );
}

/* ---------------- 3. How you join ---------------- */

export function JoinStep({ draft, set, errors }: StepProps) {
  const chosen = MEMBERSHIP_TYPES.find((t) => t.value === draft.memberType);
  const nigeria = livesInNigeria(draft);
  const mismatch =
    draft.country && ((draft.memberType === "home" && !nigeria) || (draft.memberType === "diaspora" && nigeria))
      ? `You told us you live in ${countryName(draft)}, so ${nigeria ? "Home member" : "Diaspora member"} may fit better. You can still choose this.`
      : null;
  return (
    <div className="space-y-7">
      {draft.route !== "none" && (
        <div>
          <ChoiceGroup
            id="memberType"
            legend="Membership type"
            options={MEMBERSHIP_TYPES}
            value={draft.memberType}
            onChange={(v) => set({ memberType: v as Draft["memberType"] })}
            error={errors.memberType}
          />
          {chosen && (
            <p className="mt-3 text-[14.5px] leading-relaxed text-body" aria-live="polite">
              {chosen.more}
              {mismatch && <span className="mt-1 block font-medium text-gold-ink">{mismatch}</span>}
            </p>
          )}
        </div>
      )}

      <ChoiceGroup
        id="route"
        legend="Your link to Edo State or Abuja FCT"
        hint="Our societies are registered in Edo and the FCT. Members need to live there, or own or hold land or a home there, including family land (bye-law 5.2)."
        layout="rows"
        options={ROUTE_OPTIONS}
        value={draft.route}
        onChange={(v) => set({ route: v as Draft["route"], routeDetail: v === draft.route ? draft.routeDetail : "" })}
        error={errors.route}
      />

      {(draft.route === "land" || draft.route === "other") && (
        <Field
          id="routeDetail"
          label={draft.route === "land" ? "Where is the land or home? (town, area, and whose name it is in)" : "Tell us about your link"}
          hint={draft.route === "other" ? "The Director of Cooperatives decides links like this. We send yours with your application." : undefined}
          error={errors.routeDetail}
        >
          {(a) => (
            <textarea
              {...a}
              rows={3}
              placeholder={draft.route === "land" ? "e.g. family compound, Uselu, Benin City, in my father’s name" : "e.g. I run a business in Abuja but live in Kaduna"}
              className={`${inputClass} resize-y`}
              value={draft.routeDetail}
              onChange={(e) => set({ routeDetail: e.target.value })}
            />
          )}
        </Field>
      )}

      {draft.route === "none" && (
        <div role="status" className="rounded-[20px] border border-gold/50 bg-butter px-5 py-5 sm:px-6">
          <p className="font-display text-[20px] font-bold text-forest-900">You can’t become a member just yet, but you can still be part of this.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            The law lets our societies admit only people with a link to Edo State or the FCT. Join the Supporter list instead: we will keep you up
            to date, invite you to open events, and tell you if the rules change so you can apply.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            If you do have family land or a home there, choose that option above instead.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- 4. Identity ---------------- */

export function IdentityStep({ draft, set, errors }: StepProps) {
  const group = draft.memberType === "group";
  const nigeria = livesInNigeria(draft);
  const idOptions = idOptionsFor(draft);
  const idLabel = idOptions.find((o) => o.value === draft.idChoice)?.label;
  const checklist = group
    ? [
        `The group’s ${draft.groupDoc === "regcert" ? "registration certificate" : draft.groupDoc === "cac" ? "CAC certificate" : "CAC or registration certificate"}`,
        `The representative’s ${idLabel ?? (nigeria ? "BVN or NIN" : "Non-Resident BVN or passport")}`,
        "Proof of the group’s address, such as a utility bill or bank letter",
        "A clear selfie of the representative, taken on a phone",
      ]
    : [
        `Your ${idLabel ?? (nigeria ? "BVN or NIN" : "Non-Resident BVN or passport")}`,
        "Proof of address, such as a recent utility bill, bank statement or tenancy agreement",
        "A clear selfie, taken on your phone, to match your ID",
      ];
  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed text-body">
        {nigeria
          ? "Because you live in Nigeria, we check identity with your BVN or NIN."
          : `Because you live in ${draft.country ? countryName(draft) : "another country"}, we check identity with a Non-Resident BVN or your passport.`}{" "}
        Everyone also shows proof of address and takes a selfie (bye-law 6.1).
      </p>

      {group && (
        <div className="grid gap-5 rounded-[20px] border border-line bg-page p-4 sm:grid-cols-2 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink sm:col-span-2">
            <PeopleIcon size={20} className="text-forest-800" /> Your group (bye-law 5.3)
          </p>
          <Field id="groupName" label="Group’s registered name" error={errors.groupName}>
            {(a) => <input {...a} type="text" autoComplete="organization" className={inputClass} value={draft.groupName} onChange={(e) => set({ groupName: e.target.value })} />}
          </Field>
          <Field id="repName" label="Representative’s full name" hint="The one person who acts and votes for the group." error={errors.repName}>
            {(a) => <input {...a} type="text" className={inputClass} value={draft.repName} onChange={(e) => set({ repName: e.target.value })} />}
          </Field>
          <div className="sm:col-span-2">
            <ChoiceGroup
              id="groupDoc"
              legend="Registration document"
              layout="pair"
              options={GROUP_DOC_OPTIONS}
              value={draft.groupDoc}
              onChange={(v) => set({ groupDoc: v })}
              error={errors.groupDoc}
            />
          </div>
        </div>
      )}

      <ChoiceGroup
        id="idChoice"
        legend={group ? "Which ID will the representative use?" : "Which ID will you use?"}
        layout="pair"
        options={idOptions}
        value={draft.idChoice}
        onChange={(v) => set({ idChoice: v })}
        error={errors.idChoice}
      />

      <div className="rounded-[20px] border border-line p-4 sm:p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <IdIcon size={20} className="text-forest-800" /> Have these ready
        </p>
        <ul className="mt-3 space-y-2.5">
          {checklist.map((c) => (
            <li key={c} className="flex gap-2.5 text-[15px] leading-snug text-body">
              <CheckIcon size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-forest-700" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <Note>
        <span className="flex gap-2.5">
          <LockIcon size={20} className="mt-0.5 shrink-0" />
          <span>
            You’ll complete the secure ID check with our verification partner once your account opens. We never store your BVN or NIN. Nothing is
            uploaded on this page.
          </span>
        </span>
      </Note>
    </div>
  );
}

/* ---------------- 5. Nominee and agreements ---------------- */

export function NomineeStep({ draft, set, errors }: StepProps) {
  const group = draft.memberType === "group";
  const total = nomineeTotal(draft.nominees);
  const update = (i: number, patch: Partial<Draft["nominees"][number]>) =>
    set({ nominees: draft.nominees.map((n, j) => (j === i ? { ...n, ...patch } : n)) });
  const decl = (patch: Partial<Draft["decl"]>) => set({ decl: { ...draft.decl, ...patch } });

  return (
    <div className="space-y-8">
      {group ? (
        <Note>Groups don’t name a nominee. If the group is wound up, its shares are dealt with under the bye-laws and the Act.</Note>
      ) : (
        <section aria-labelledby="nominees-h">
          <h2 id="nominees-h" className="font-sans text-[17px] font-semibold text-ink">
            Your nominees
          </h2>
          <p className="mt-1 text-[14.5px] leading-relaxed text-muted">
            If you die, the value of your shares goes to the people you name here (bye-law 10.1). Split it between them in whole percentages.
          </p>
          <ul className="mt-4 space-y-4">
            {draft.nominees.map((n, i) => (
              <li key={n.id} className="rounded-[20px] border border-line bg-page p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-forest-800">Nominee {i + 1}</p>
                  {draft.nominees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => set({ nominees: draft.nominees.filter((_, j) => j !== i) })}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-clay hover:bg-[#f6e9e4]"
                    >
                      <CloseIcon size={16} /> Remove<span className="sr-only"> nominee {i + 1}</span>
                    </button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`nominee-${i}-name`} label="Full name" error={errors[`nominee-${i}-name`]}>
                    {(a) => <input {...a} type="text" className={inputClass} value={n.name} onChange={(e) => update(i, { name: e.target.value })} />}
                  </Field>
                  <Field id={`nominee-${i}-relationship`} label="Relationship to you" error={errors[`nominee-${i}-relationship`]}>
                    {(a) => <input {...a} type="text" placeholder="e.g. daughter" className={inputClass} value={n.relationship} onChange={(e) => update(i, { relationship: e.target.value })} />}
                  </Field>
                  <Field id={`nominee-${i}-contact`} label="Phone or email" error={errors[`nominee-${i}-contact`]}>
                    {(a) => <input {...a} type="text" inputMode="email" className={inputClass} value={n.contact} onChange={(e) => update(i, { contact: e.target.value })} />}
                  </Field>
                  <Field id={`nominee-${i}-share`} label="Share" error={errors[`nominee-${i}-share`]}>
                    {(a) => (
                      <div className="relative max-w-40">
                        <input
                          {...a}
                          type="text"
                          inputMode="numeric"
                          maxLength={3}
                          className={`${inputClass} pr-10`}
                          value={n.share}
                          onChange={(e) => update(i, { share: e.target.value.replace(/[^\d]/g, "") })}
                        />
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">
                          %
                        </span>
                      </div>
                    )}
                  </Field>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {draft.nominees.length < 5 ? (
              <button
                type="button"
                onClick={() => set({ nominees: [...draft.nominees, newNominee(total < 100 ? String(100 - total) : "")] })}
                className="inline-flex min-h-11 items-center rounded-full border border-forest-800 px-5 text-[15px] font-semibold text-forest-800 hover:bg-mist"
              >
                + Add another nominee
              </button>
            ) : (
              <span className="text-[14px] text-muted">You can name up to 5 nominees.</span>
            )}
            <p
              id="nomineeTotal"
              tabIndex={-1}
              aria-live="polite"
              aria-describedby={errors.nomineeTotal ? "nomineeTotal-error" : undefined}
              className={`rounded-full px-4 py-2 text-[15px] font-semibold ${total === 100 ? "bg-mist text-forest-800" : "bg-butter text-gold-ink"}`}
            >
              Total: {total}%{total === 100 ? " ✓" : " of 100%"}
            </p>
          </div>
          <div className="flex justify-end">
            <ErrorText id="nomineeTotal-error">{errors.nomineeTotal}</ErrorText>
          </div>
        </section>
      )}

      <section aria-labelledby="decl-h">
        <h2 id="decl-h" className="font-sans text-[17px] font-semibold text-ink">
          Declarations
        </h2>
        <p className="mt-1 text-[14.5px] text-muted">Please read and tick each one.</p>
        <div className="mt-4 space-y-3">
          <Checkbox id="decl-character" checked={draft.decl.character} onChange={(v) => decl({ character: v })} error={errors["decl-character"]}>
            {group ? "The group and its representative are" : "I am"} of good character and have never been convicted of fraud or dishonesty
            (bye-law 5.1b).
          </Checkbox>
          <Checkbox id="decl-bylaws" checked={draft.decl.bylaws} onChange={(v) => decl({ bylaws: v })} error={errors["decl-bylaws"]}>
            I have read and accept the{" "}
            <a href="/documents" target="_blank" rel="noopener" className="font-medium underline">
              HomeBridge bye-laws<span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </Checkbox>
          <Checkbox id="decl-risk" checked={draft.decl.risk} onChange={(v) => decl({ risk: v })} error={errors["decl-risk"]}>
            I understand the risk notice: there is no guaranteed return, HomeBridge is not a savings or deposit scheme, and shares can only be withdrawn
            after 3 years, with 6 months’ notice.
          </Checkbox>
          <Checkbox id="decl-privacy" checked={draft.decl.privacy} onChange={(v) => decl({ privacy: v })} error={errors["decl-privacy"]}>
            I have read the{" "}
            <a href="/documents" target="_blank" rel="noopener" className="font-medium underline">
              privacy notice<span className="sr-only"> (opens in a new tab)</span>
            </a>
            . My details are handled under Nigeria’s Data Protection Act 2023 and, for people in the UK, the UK GDPR.
          </Checkbox>
        </div>
      </section>
    </div>
  );
}

/* ---------------- 6. Check and send ---------------- */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[minmax(0,200px)_1fr] sm:gap-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] break-words text-ink">{value || <span className="text-muted">Not given</span>}</dd>
    </div>
  );
}

function Group({ step, index, onEdit, children }: { step: StepId; index: number; onEdit: (i: number) => void; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line p-4 sm:p-5" aria-labelledby={`sum-${step}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`sum-${step}`} className="font-sans text-[16px] font-semibold text-forest-800">
          {index + 1}. {STEP_LABELS[step]}
        </h2>
        <button
          type="button"
          onClick={() => onEdit(index)}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-[14.5px] font-semibold text-forest-800 underline underline-offset-[3px] hover:bg-mist"
        >
          Edit<span className="sr-only"> {STEP_LABELS[step]}</span>
        </button>
      </div>
      <dl className="mt-1 divide-y divide-line/70">{children}</dl>
    </section>
  );
}

export function ReviewStep({ draft, onEdit }: { draft: Draft; onEdit: (i: number) => void }) {
  const fee = feeFor(draft);
  const route = ROUTE_OPTIONS.find((r) => r.value === draft.route)?.label;
  const idLabel = idOptionsFor(draft).find((o) => o.value === draft.idChoice)?.label;
  const group = draft.memberType === "group";
  return (
    <div className="space-y-4">
      <Group step="account" index={0} onEdit={onEdit}>
        <Row label={draft.contactMethod === "phone" ? "Phone" : "Email"} value={draft.contact} />
      </Group>
      <Group step="about" index={1} onEdit={onEdit}>
        <Row label="Full name" value={draft.fullName} />
        <Row
          label="Date of birth"
          value={draft.dob ? new Date(`${draft.dob}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}
        />
        <Row label="Lives in" value={[draft.city, livesInNigeria(draft) ? draft.state : "", countryName(draft)].filter(Boolean).join(", ")} />
        <Row label="Address" value={draft.address} />
        <Row label="WhatsApp" value={draft.whatsapp} />
        <Row label="Email" value={draft.email || (draft.contactMethod === "email" ? draft.contact : "")} />
        <Row label="Occupation" value={draft.occupation} />
        <Row label="Heard about us" value={draft.heard} />
        <Row label="Chapter" value={draft.chapter} />
      </Group>
      <Group step="join" index={2} onEdit={onEdit}>
        <Row label="Membership type" value={typeLabel(draft.memberType)} />
        <Row label="Link to Edo or FCT" value={route} />
        {(draft.route === "land" || draft.route === "other") && <Row label="Details" value={draft.routeDetail} />}
      </Group>
      <Group step="identity" index={3} onEdit={onEdit}>
        {group && <Row label="Group" value={draft.groupName} />}
        {group && <Row label="Representative" value={draft.repName} />}
        {group && <Row label="Registration document" value={GROUP_DOC_OPTIONS.find((o) => o.value === draft.groupDoc)?.label} />}
        <Row label={group ? "Representative’s ID" : "ID you will use"} value={idLabel} />
        <Row label="ID check" value="With our verification partner, once your account opens" />
      </Group>
      <Group step="nominee" index={4} onEdit={onEdit}>
        {!group &&
          draft.nominees.map((n, i) => (
            <Row key={n.id} label={`Nominee ${i + 1}`} value={`${n.name} (${n.relationship}), ${n.contact}, ${n.share}%`} />
          ))}
        <Row label="Declarations" value={Object.values(draft.decl).every(Boolean) ? "All four confirmed" : "Not all confirmed yet"} />
      </Group>

      <section aria-labelledby="next-h" className="rounded-[20px] bg-mist p-5 sm:p-6">
        <h2 id="next-h" className="font-display text-[20px] text-forest-900">
          What happens next
        </h2>
        <ol className="mt-3 space-y-3">
          {[
            "A membership officer reviews your application. We decide within 30 days, and aim for 2 working days (bye-law 6.2).",
            `If you are approved, we send you a link to pay the joining fee of ${fee.fee}${fee.note ? ` (${fee.note})` : ""}. It is paid to ${JOINING_FEE.payee}, ${JOINING_FEE.payeeRole}. It is not a share and is not refundable.`,
            "You become a member once the fee is paid, you have bought at least one share, and your name is on the register of members (bye-law 6.4).",
            "If we can’t approve you, we tell you why. You can ask the next general meeting to review the decision.",
          ].map((t, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-forest-900">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] font-semibold text-cream">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ---------------- Supporter list ---------------- */

export function SupporterStep({ draft, set, errors, onEdit }: StepProps & { onEdit: (i: number) => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[20px] border border-line p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-forest-800">We’ll add</p>
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="inline-flex min-h-11 items-center rounded-full px-4 text-[14.5px] font-semibold text-forest-800 underline underline-offset-[3px] hover:bg-mist"
          >
            Edit<span className="sr-only"> your details</span>
          </button>
        </div>
        <dl className="mt-1 divide-y divide-line/70">
          <Row label="Name" value={draft.fullName} />
          <Row label="Lives in" value={[draft.city, livesInNigeria(draft) ? draft.state : "", countryName(draft)].filter(Boolean).join(", ")} />
          <Row label="WhatsApp" value={draft.whatsapp} />
          <Row label="Email" value={draft.email || (draft.contactMethod === "email" ? draft.contact : "")} />
        </dl>
      </div>
      <ul className="space-y-2.5">
        {[
          "News from HomeBridge, a few times a year",
          "Invitations to open events and launches",
          "A message if the rules change and you can apply",
        ].map((t) => (
          <li key={t} className="flex gap-2.5 text-[15px] text-body">
            <CheckIcon size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-forest-700" />
            {t}
          </li>
        ))}
      </ul>
      <p className="text-[14.5px] text-muted">Supporters are not members: there is no fee, no shares and no vote.</p>
      <Checkbox id="supporterConsent" checked={draft.supporterConsent} onChange={(v) => set({ supporterConsent: v })} error={errors.supporterConsent}>
        HomeBridge may contact me by WhatsApp or email about the cooperative. I have read the{" "}
        <a href="/documents" target="_blank" rel="noopener" className="font-medium underline">
          privacy notice<span className="sr-only"> (opens in a new tab)</span>
        </a>{" "}
        and can leave the list at any time.
      </Checkbox>
      <p className="flex items-center gap-2 text-[14px] text-muted">
        <WhatsAppIcon size={18} className="text-forest-700" /> Questions?{" "}
        <a href={CONTACT.whatsapp} target="_blank" rel="noopener">
          WhatsApp us
        </a>
      </p>
    </div>
  );
}

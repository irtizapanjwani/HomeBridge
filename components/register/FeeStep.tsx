"use client";

import { useState } from "react";
import { BANK_METHOD, CARD_METHOD, PAY_TOKEN_PREFIX, STRIPE_PAYMENT_LINK } from "@/lib/payment-methods";
import { JOINING_FEE } from "@/lib/settings";
import { feeFor, livesInNigeria, type Draft, type Errors } from "@/lib/register-data";
import type { ReceiptUpload as Receipt } from "@/lib/receipt";
import { Checkbox, ChoiceGroup, Field, Note, inputClass } from "./fields";
import { ReceiptUpload } from "./ReceiptUpload";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * The joining fee, paid during the application rather than after approval.
 *
 * It mirrors the VEKAT form so a registration from either site reads the same in the admin queue.
 * The date and transaction id are optional on purpose: an applicant may upload a receipt instead,
 * or send one within seven days, and an officer confirms the money against the account either way.
 */
export function FeeStep({
  draft,
  set,
  errors,
  receipt,
  onReceipt,
}: {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: Errors;
  receipt: Receipt | null;
  onReceipt: (r: Receipt | null) => void;
}) {
  const [opened, setOpened] = useState(false);
  const fee = feeFor(draft);
  const byCard = draft.paymentMethod === CARD_METHOD;
  const nigeria = livesInNigeria(draft);

  function payNow() {
    // The token travels with the payment as client_reference_id, so an officer can match it back
    // to this application without reading card details.
    const token = PAY_TOKEN_PREFIX + crypto.randomUUID();
    const url = new URL(STRIPE_PAYMENT_LINK);
    url.searchParams.set("client_reference_id", token);
    const email = draft.email || (draft.contactMethod === "email" ? draft.contact : "");
    if (isEmail(email)) url.searchParams.set("prefilled_email", email);
    // The transaction id is left for the payer to copy from their own Stripe receipt. Filling it
    // with our token would look like a confirmed payment while proving only that they clicked Pay.
    window.open(url.toString(), "_blank");
    setOpened(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <Note>
        The joining fee is {fee.fee}
        {fee.note ? ` (${fee.note})` : ""}, paid to {JOINING_FEE.payee}, {JOINING_FEE.payeeRole}. It is a one-off charge.
        It is not a share and it is not refundable.
      </Note>

      <ChoiceGroup
        id="paymentMethod"
        legend="How are you paying?"
        options={[
          { value: BANK_METHOD, label: "Bank transfer (naira)", sub: "VEKAT Nigeria Limited · First Bank · 2049483671" },
          { value: CARD_METHOD, label: "Card payment", sub: "Card, Apple Pay or Google Pay through Stripe" },
        ]}
        value={draft.paymentMethod}
        onChange={(v) => set({ paymentMethod: v })}
        error={errors.paymentMethod}
      />

      {draft.paymentMethod === BANK_METHOD && (
        <Note tone="butter">
          Transfer ₦{JOINING_FEE.ngn.toLocaleString("en-GB")} to <strong>VEKAT Nigeria Limited</strong>, First Bank, account{" "}
          <strong>2049483671</strong>. Use your own name as the payment reference so we can match it to you.
          {!nigeria ? " If you are paying from outside Nigeria, a card payment is usually easier." : ""}
        </Note>
      )}

      {byCard && (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={payNow}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-800 px-6 font-semibold text-cream transition hover:bg-forest-900"
          >
            {opened ? "Open the payment page again" : "Pay now by card"}
          </button>
          <p className="m-0 text-[13.5px] text-muted">
            The payment opens in a new tab. When you are done, come back here and enter the date and the transaction ID from
            your Stripe receipt, or upload the receipt below.
          </p>
        </div>
      )}

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field id="datePaid" label="Date paid" optional error={errors.datePaid}>
          {(a11y) => (
            <input
              {...a11y}
              type="date"
              value={draft.datePaid}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => set({ datePaid: e.target.value })}
              className={inputClass}
            />
          )}
        </Field>
        <Field id="paymentReference" label="Payment reference or transaction ID" optional error={errors.paymentReference}>
          {(a11y) => (
            <input
              {...a11y}
              value={draft.paymentReference}
              onChange={(e) => set({ paymentReference: e.target.value })}
              autoComplete="off"
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <Field id="payerName" label="If someone else paid for you, what name is on their account?" optional>
        {(a11y) => (
          <input
            {...a11y}
            value={draft.payerName}
            onChange={(e) => set({ payerName: e.target.value })}
            placeholder="Leave blank if you paid yourself"
            autoComplete="off"
            className={inputClass}
          />
        )}
      </Field>

      <ReceiptUpload value={receipt} onChange={onReceipt} />

      <Checkbox id="receiptConfirmed" checked={draft.receiptConfirmed} onChange={(v) => set({ receiptConfirmed: v })}>
        I have emailed my payment receipt to info@homebridgecooperative.org
      </Checkbox>
    </div>
  );
}

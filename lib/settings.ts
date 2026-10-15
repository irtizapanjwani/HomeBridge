// Society-wide settings from the developer brief. In the live system these come from the database and
// can only be changed by two admins (brief: "Bank details editable only with two-admin approval").
// Every value marked "setting" in the bye-laws can be changed by the AGM without code.

export const SOCIETIES = [
  { code: "ED", name: "HomeBridge Cooperative Society Ltd (Edo State)" },
  { code: "FC", name: "HomeBridge Cooperative Society Ltd (FCT)" },
] as const;

/** Bye-law 6.3 / 20.4 (Draft 3): the joining fee is VEKAT's charge, paid to VEKAT. Payee is a setting, not hard-coded. */
export const JOINING_FEE = {
  ngn: 10_000,
  gbp: 10,
  payee: "VEKAT Group Ltd",
  payeeRole: "the cooperative’s appointed manager",
  channels: [
    { id: "stripe", label: "Card · Apple Pay · Google Pay (Stripe)", currencies: ["GBP", "USD", "EUR"] },
    { id: "firstbank", label: "First Bank transfer (naira)", currencies: ["NGN"] },
  ],
} as const;

export const SHARE_PRICE_NGN = 1_000; // bye-law 11.1
export const MIN_MONTHLY = { ngn: 5_000, gbp: 25 }; // bye-law 11.2 (setting)
export const FOUNDING_BLOCK = { ngn: 2_000_000, gbp: 1_000 }; // bye-law 5.4 (setting)
export const MAX_HOLDING_SHARE = 0.2; // bye-law 11.3
export const MAX_PROXIES = 5; // bye-law 16.4

/** Bye-law 14.1: the Society's nominated accounts. Details still to be confirmed by the client. */
export const SOCIETY_ACCOUNTS = {
  NGN: {
    label: "UBA naira account",
    bank: "United Bank for Africa (UBA) — to be confirmed",
    accountName: "HomeBridge Cooperative Society Ltd",
    accountNumber: "[UBA naira account number — to be confirmed]",
    extra: null as null | { label: string; value: string },
  },
  USD: {
    label: "US dollar domiciliary",
    bank: "[Bank — to be confirmed]",
    accountName: "HomeBridge Cooperative Society Ltd",
    accountNumber: "[USD domiciliary number — to be confirmed]",
    extra: { label: "SWIFT / BIC", value: "[To be confirmed]" },
  },
  GBP: {
    label: "Pound sterling domiciliary",
    bank: "[Bank — to be confirmed]",
    accountName: "HomeBridge Cooperative Society Ltd",
    accountNumber: "[GBP domiciliary number — to be confirmed]",
    extra: { label: "SWIFT / BIC", value: "[To be confirmed]" },
  },
} as const;

export type Currency = keyof typeof SOCIETY_ACCOUNTS;

/** Illustration only — real conversions use the bank rate on the day received (bye-law 11.2). */
export const EXAMPLE_RATES: Record<Currency, number> = { NGN: 1, USD: 1_500, GBP: 2_000 };

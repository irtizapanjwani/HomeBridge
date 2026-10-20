// The two ways to pay the joining fee.
//
// Deliberately the same strings as the VEKAT form writes, so one registration from either site
// reads identically in the admin queue and neither has to be translated into the other.

/** The two ways to pay the joining fee. The form shows these and the server checks them. */
export const BANK_METHOD = "Bank transfer to VEKAT First Bank 2049483671 (₦10,000)";
export const CARD_METHOD = "Secure card payment link (£10)";

/**
 * The client's Stripe Payment Link for the joining fee. Pay now opens it in a new tab.
 *
 * Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to override it. The link and STRIPE_SECRET_KEY must belong
 * to the same Stripe account AND the same mode: a test key cannot see a live link, and every
 * payment check then fails. A test link has test_ in its URL; the live one below does not.
 */
export const STRIPE_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/8x214nbjMdZg2gddNI8IU00";

/**
 * Starts the random code the form sends to Stripe as client_reference_id, so a payment made on the
 * link can be matched back to this form.
 */
export const PAY_TOKEN_PREFIX = "vekatpay_";
export const isPayToken = (v: string) => new RegExp(`^${PAY_TOKEN_PREFIX}[A-Za-z0-9-]{20,60}$`).test(v);

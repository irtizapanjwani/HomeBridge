// The VEKAT joining fee receipt (brief p.3: "generates the VEKAT receipt VKT-RCP-YY-NNNNN as a
// PDF"; reference format on p.5).
//
// The heading, the two standing notices and the signature block come from the client's own
// template, 02_Joining_Fee_Receipt_TEMPLATE.docx, and are reproduced as written. Only the
// bracketed fields are filled in.

import "server-only";

import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { drawNaira } from "@/lib/pdf/draw";
import { embeddableFonts } from "@/lib/pdf/fonts";

const GREEN = rgb(0x17 / 255, 0x45 / 255, 0x2f / 255);
const INK = rgb(0x1a / 255, 0x1d / 255, 0x1a / 255);
const MUTED = rgb(0x5e / 255, 0x68 / 255, 0x62 / 255);
const LINE = rgb(0xe3 / 255, 0xdd / 255, 0xca / 255);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

export type ReceiptInput = {
  /** VKT-RCP-YY-NNNNN. */
  receiptNo: string;
  fullName: string;
  /** The application reference the payment was made against. */
  applicationRef: string;
  /** Present only once the applicant has been admitted. */
  memberNo?: string;
  /** "Home" or "Diaspora", for the description line. */
  category: string;
  /** Minor-unit-free amount, e.g. 10 or 10000. */
  amount: number;
  currency: "GBP" | "NGN" | "USD";
  method: string;
  transactionRef?: string;
  receivedAt: Date;
  /** The payee, from settings rather than hard-coded: it is a company name on a legal receipt. */
  payee: string;
  payeeRole: string;
};

const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SYMBOL: Record<ReceiptInput["currency"], string> = { GBP: "£", NGN: "", USD: "$" };
const UNIT: Record<ReceiptInput["currency"], string> = { GBP: "pounds", NGN: "naira", USD: "dollars" };

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Whole numbers in words, for the "amount in words" the template asks for. */
function inWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${inWords(n % 100)}` : ""}`;
  if (n < 1_000_000) {
    return `${inWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${inWords(n % 1000)}` : ""}`;
  }
  return `${inWords(Math.floor(n / 1_000_000))} million${n % 1_000_000 ? ` ${inWords(n % 1_000_000)}` : ""}`;
}

function amountInWords(amount: number, currency: ReceiptInput["currency"]): string {
  const words = `${inWords(Math.round(amount))} ${UNIT[currency]}`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function money(amount: number, currency: ReceiptInput["currency"]): string {
  const body = currency === "NGN" ? amount.toLocaleString("en-GB") : amount.toFixed(2);
  return `${SYMBOL[currency]}${currency === "NGN" ? `${body}.00` : body}`;
}

/** Wraps text to a width at x, returning the baseline below the last line. */
function paragraph(page: PDFPage, text: string, font: PDFFont, size: number, x: number, top: number, maxWidth: number, lineHeight: number, color = MUTED) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  let y = top;
  for (const l of lines) {
    page.drawText(l, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

export async function buildReceipt(input: ReceiptInput): Promise<Uint8Array> {
  const files = await embeddableFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const loraBold = await doc.embedFont(files.loraBold, { subset: true });
  const poppins = await doc.embedFont(files.poppins, { subset: true });
  const poppinsSemi = await doc.embedFont(files.poppinsSemi, { subset: true });

  doc.setTitle(`VEKAT joining fee receipt ${input.receiptNo}`);
  doc.setAuthor(input.payee);
  doc.setSubject(`Joining fee receipt for ${input.fullName}`);
  doc.setProducer("HomeBridge member platform");
  doc.setCreationDate(input.receivedAt);

  const page = doc.addPage(A4);
  const [W, H] = A4;
  const right = W - MARGIN;
  const width = W - MARGIN * 2;

  page.drawText(input.payee.toUpperCase(), { x: MARGIN, y: H - 76, size: 18, font: loraBold, color: GREEN });
  page.drawText(input.payeeRole, { x: MARGIN, y: H - 94, size: 10.5, font: poppins, color: MUTED });

  const title = "OFFICIAL RECEIPT";
  page.drawText(title, {
    x: right - poppinsSemi.widthOfTextAtSize(title, 13),
    y: H - 76,
    size: 13,
    font: poppinsSemi,
    color: INK,
  });
  const no = `Receipt No. ${input.receiptNo}`;
  page.drawText(no, { x: right - poppins.widthOfTextAtSize(no, 11), y: H - 94, size: 11, font: poppins, color: MUTED });

  page.drawLine({ start: { x: MARGIN, y: H - 112 }, end: { x: right, y: H - 112 }, thickness: 1.2, color: GREEN });

  // The table of fields, in the order the client's template lists them.
  // The third element marks a value that needs the naira sign drawn in front of it.
  const rows: [string, string, boolean?][] = [
    ["Received from", input.fullName],
    ["Application reference", input.applicationRef],
    ["Membership number", input.memberNo ?? "Issued on approval"],
    ["Description", `HomeBridge Cooperative membership joining fee (${input.category})`],
    ["Amount", `${money(input.amount, input.currency)}  (${amountInWords(input.amount, input.currency)})`, input.currency === "NGN"],
    ["Payment method", input.method],
    ["Transaction reference", input.transactionRef || "—"],
    ["Date received", DATE.format(input.receivedAt)],
  ];

  const labelX = MARGIN;
  const valueX = MARGIN + 170;
  let y = H - 150;
  for (const [label, value, naira] of rows) {
    page.drawText(label, { x: labelX, y, size: 10.5, font: poppinsSemi, color: MUTED });
    const signWidth = naira ? drawNaira(page, { x: valueX, y, size: 11.5, font: poppins, color: INK }) : 0;
    const textX = valueX + signWidth;
    const bottom = paragraph(page, value, poppins, 11.5, textX, y, right - textX, 15, INK);
    const rowBottom = Math.min(y, bottom + 15) - 12;
    page.drawLine({ start: { x: MARGIN, y: rowBottom }, end: { x: right, y: rowBottom }, thickness: 0.7, color: LINE });
    y = rowBottom - 20;
  }

  y -= 10;
  y = paragraph(
    page,
    "This is a one-off joining fee, separate from share contributions. All share contributions are paid only into HomeBridge Cooperative’s own accounts, never to VEKAT and never to a personal account.",
    poppins,
    10,
    MARGIN,
    y,
    width,
    14,
  );
  y -= 10;
  y = paragraph(
    page,
    "The joining (registration) fee is non-refundable, including where an application is not approved.",
    poppinsSemi,
    10,
    MARGIN,
    y,
    width,
    14,
    INK,
  );

  const signY = Math.max(y - 56, 150);
  page.drawText("Issued by:", { x: MARGIN, y: signY + 22, size: 10, font: poppins, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: signY }, end: { x: MARGIN + 240, y: signY }, thickness: 0.9, color: MUTED });
  page.drawText("Marvin Ayuba, Administrator", { x: MARGIN, y: signY - 16, size: 10.5, font: poppinsSemi, color: INK });
  page.drawText(`${input.payee}  ·  admin@vekat.org`, { x: MARGIN, y: signY - 30, size: 10, font: poppins, color: MUTED });

  return doc.save();
}

// The membership certificate (brief p.4, module 4: "generate the numbered membership certificate
// PDF"; reference HBC-MC-NNNNN, "same digits as member no.", p.5).
//
// The wording, the signatories and the footer come from the client's own template,
// 01_Membership_Certificate_TEMPLATE.docx, and are reproduced here as written. Only the bracketed
// fields are filled in.
//
// Built with pdf-lib rather than a headless browser: it is pure JavaScript, so it runs inside a
// serverless function without a binary to install, and the output is the same every time.

import "server-only";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { embeddableFonts } from "@/lib/pdf/fonts";

/** Brand colours, from the client's design. */
const GREEN = rgb(0x17 / 255, 0x45 / 255, 0x2f / 255);
const GOLD = rgb(0xc9 / 255, 0xa2 / 255, 0x27 / 255);
const INK = rgb(0x1a / 255, 0x1d / 255, 0x1a / 255);
const MUTED = rgb(0x5e / 255, 0x68 / 255, 0x62 / 255);

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

export type CertificateInput = {
  /** HBC-MC-NNNNN. */
  certificateNo: string;
  fullName: string;
  /** HBC-ZONE-YY-NNNNN. */
  memberNo: string;
  /** "Home" or "Diaspora". */
  category: string;
  /** The chapter as it should read on the certificate, e.g. "Edo". */
  chapter: string;
  admittedAt: Date;
  /** Adds the founding-member sentence the template provides. */
  founding?: boolean;
  issuedAt?: Date;
};

const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Centres a line of text on the page and returns the baseline it used. */
function centre(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (A4_LANDSCAPE[0] - width) / 2, y, size, font, color });
  return y;
}

/**
 * Wraps text to a width and draws it centred, returning the baseline of the last line drawn.
 * The body sentence varies in length with the member's details, so it cannot be positioned by hand.
 */
function centreWrapped(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  top: number,
  maxWidth: number,
  lineHeight: number,
  color = INK,
) {
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
    centre(page, l, font, size, y, color);
    y -= lineHeight;
  }
  return y + lineHeight;
}

/** Builds the certificate and returns the PDF bytes. */
export async function buildCertificate(input: CertificateInput): Promise<Uint8Array> {
  const files = await embeddableFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const loraBold = await doc.embedFont(files.loraBold, { subset: true });
  const loraRegular = await doc.embedFont(files.loraRegular, { subset: true });
  const poppins = await doc.embedFont(files.poppins, { subset: true });
  const poppinsSemi = await doc.embedFont(files.poppinsSemi, { subset: true });

  doc.setTitle(`HomeBridge membership certificate ${input.certificateNo}`);
  doc.setAuthor("HomeBridge Cooperative");
  doc.setSubject(`Certificate of membership for ${input.fullName} (${input.memberNo})`);
  doc.setProducer("HomeBridge member platform");
  doc.setCreationDate(input.issuedAt ?? input.admittedAt);

  const page = doc.addPage(A4_LANDSCAPE);
  const [W, H] = A4_LANDSCAPE;

  // A green border with a thin gold inner rule, so a printed copy reads as a certificate.
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: GREEN, borderWidth: 6 });
  page.drawRectangle({ x: 38, y: 38, width: W - 76, height: H - 76, borderColor: GOLD, borderWidth: 1.5 });

  centre(page, "HOMEBRIDGE!!!  Connecting People!  ·  Building Trust!  ·  Creating Wealth!", poppins, 9.5, H - 86, MUTED);

  centre(page, "CERTIFICATE OF MEMBERSHIP", loraBold, 30, H - 140, GREEN);
  centre(page, `Certificate No. ${input.certificateNo}`, poppinsSemi, 11, H - 166, GOLD);

  centre(page, "This is to certify that", loraRegular, 14, H - 212, MUTED);

  // The member's name is the point of the page, so it is sized to fit rather than clipped.
  let nameSize = 34;
  while (loraBold.widthOfTextAtSize(input.fullName, nameSize) > W - 200 && nameSize > 16) nameSize -= 1;
  centre(page, input.fullName, loraBold, nameSize, H - 256, INK);

  centre(page, `Membership No. ${input.memberNo}`, poppinsSemi, 13, H - 284, GREEN);

  // The template gives the founding clause as an addition to the sentence, not a new one, so it
  // joins before the full stop rather than after it.
  const ending = input.founding
    ? ", and is recognised as a Founding Member of the Cooperative."
    : ".";
  const body =
    `was admitted as a ${input.category} Member of HomeBridge Cooperative, ${input.chapter} Chapter, ` +
    `on ${DATE.format(input.admittedAt)}, and is entitled to all the rights and subject to all the ` +
    `obligations set out in the Bye-laws of the Cooperative${ending}`;
  const bodyBottom = centreWrapped(page, body, poppins, 12, H - 324, W - 240, 20, INK);

  centre(page, `Date of issue: ${DATE.format(input.issuedAt ?? input.admittedAt)}`, poppins, 10.5, bodyBottom - 34, MUTED);

  // Signature lines, as laid out in the client's template.
  const signY = 118;
  const blockWidth = 230;
  const left = W / 2 - blockWidth - 40;
  const right = W / 2 + 40;
  for (const [x, role, who] of [
    [left, "Chairman", "Dr Victor Evbuomwan"],
    [right, "Secretary", "Edward Omoruyi Oseghe"],
  ] as const) {
    page.drawLine({
      start: { x, y: signY },
      end: { x: x + blockWidth, y: signY },
      thickness: 0.9,
      color: MUTED,
    });
    page.drawText(role, { x, y: signY - 16, size: 10.5, font: poppinsSemi, color: INK });
    page.drawText(who, { x, y: signY - 30, size: 10, font: poppins, color: MUTED });
  }

  centre(
    page,
    "HomeBridge Cooperative  ·  4 Eregbowa Street, off Trinity Road, Ugbor Quarters, Benin City, Edo State",
    poppins,
    8.5,
    62,
    MUTED,
  );

  return doc.save();
}

/** HBC-MC-NNNNN — the same five digits as the membership number (brief p.5). */
export function certificateNoFor(memberNo: string): string {
  const digits = memberNo.slice(-5);
  return `HBC-MC-${digits}`;
}

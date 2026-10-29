// A small writer for the pack's form-style documents (payment guide, declaration, nominee form).
//
// It keeps a cursor down the page, wraps text, starts a new page when the next block would not fit,
// and puts the client's footer line ("HOMEBRIDGE!!! … · info@… · Page n of N") on every page, as the
// templates do. Text may contain ₦: the brand fonts have no glyph for it, so it is drawn by
// drawNaira wherever it appears, and measured the same way so wrapping stays right.

import "server-only";

import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { drawNaira } from "@/lib/pdf/draw";
import { embeddableFonts } from "@/lib/pdf/fonts";

export const GREEN = rgb(0x17 / 255, 0x45 / 255, 0x2f / 255);
export const GOLD = rgb(0xc9 / 255, 0xa2 / 255, 0x27 / 255);
export const INK = rgb(0x1a / 255, 0x1d / 255, 0x1a / 255);
export const MUTED = rgb(0x5e / 255, 0x68 / 255, 0x62 / 255);
export const LINE = rgb(0xe3 / 255, 0xdd / 255, 0xca / 255);
export const PANEL = rgb(0xf7 / 255, 0xf0 / 255, 0xda / 255);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 54;
const FOOTER_SPACE = 48;

export const MOTTO = "HOMEBRIDGE!!!  Connecting People!  ·  Building Trust!  ·  Creating Wealth!";

type Fonts = { loraBold: PDFFont; poppins: PDFFont; poppinsSemi: PDFFont };

const NAIRA = "₦";

export class FormWriter {
  readonly doc: PDFDocument;
  readonly fonts: Fonts;
  page!: PDFPage;
  y = 0;
  readonly width = A4[0] - MARGIN * 2;
  readonly left = MARGIN;
  readonly right = A4[0] - MARGIN;
  private readonly footerText: string;

  private constructor(doc: PDFDocument, fonts: Fonts, footerText: string) {
    this.doc = doc;
    this.fonts = fonts;
    this.footerText = footerText;
    this.newPage();
  }

  static async create(opts: { title: string; subject: string; footerEmail: string }): Promise<FormWriter> {
    const files = await embeddableFonts();
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = {
      loraBold: await doc.embedFont(files.loraBold, { subset: true }),
      poppins: await doc.embedFont(files.poppins, { subset: true }),
      poppinsSemi: await doc.embedFont(files.poppinsSemi, { subset: true }),
    };
    doc.setTitle(opts.title);
    doc.setSubject(opts.subject);
    doc.setAuthor("HomeBridge Cooperative");
    doc.setProducer("HomeBridge member platform");
    return new FormWriter(doc, fonts, `HOMEBRIDGE!!! Connecting People! Building Trust! Creating Wealth!  ·  ${opts.footerEmail}`);
  }

  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }

  /** Starts a new page if `needed` points would run into the footer. */
  ensure(needed: number) {
    if (this.y - needed < FOOTER_SPACE + 14) this.newPage();
  }

  // ---------- Text with ₦ ----------

  measure(text: string, font: PDFFont, size: number): number {
    const parts = text.split(NAIRA);
    const naira = font.widthOfTextAtSize("N", size) + size * 0.055;
    return parts.reduce((w, p) => w + font.widthOfTextAtSize(p, size), 0) + (parts.length - 1) * naira;
  }

  drawText(text: string, x: number, y: number, font: PDFFont, size: number, color: RGB = INK) {
    const parts = text.split(NAIRA);
    let cx = x;
    parts.forEach((part, i) => {
      if (i > 0) cx += drawNaira(this.page, { x: cx, y, size, font, color });
      if (part) {
        this.page.drawText(part, { x: cx, y, size, font, color });
        cx += font.widthOfTextAtSize(part, size);
      }
    });
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const para of text.split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && this.measure(next, font, size) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  // ---------- Blocks ----------

  /** The motto line and the document title, as each template opens. */
  header(title: string) {
    this.drawText(MOTTO, this.left, this.y - 9, this.fonts.poppinsSemi, 8.5, GOLD);
    this.y -= 38;
    this.drawText(title, this.left, this.y, this.fonts.loraBold, 21, GREEN);
    this.y -= 12;
    this.page.drawLine({ start: { x: this.left, y: this.y }, end: { x: this.right, y: this.y }, thickness: 1.2, color: GREEN });
    this.y -= 22;
  }

  heading(text: string) {
    this.ensure(70);
    this.y -= 6;
    this.drawText(text, this.left, this.y, this.fonts.poppinsSemi, 12.5, GREEN);
    this.y -= 18;
  }

  paragraph(text: string, opts: { size?: number; font?: PDFFont; color?: RGB; indent?: number; gap?: number } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.font ?? this.fonts.poppins;
    const x = this.left + (opts.indent ?? 0);
    const lineHeight = size * 1.45;
    for (const line of this.wrap(text, font, size, this.right - x)) {
      this.ensure(lineHeight);
      this.drawText(line, x, this.y, font, size, opts.color ?? INK);
      this.y -= lineHeight;
    }
    this.y -= opts.gap ?? 6;
  }

  /** A numbered or bulleted list with hanging indents. */
  list(items: string[], opts: { numbered?: boolean; size?: number } = {}) {
    const size = opts.size ?? 10.5;
    const lineHeight = size * 1.45;
    const indent = 20;
    items.forEach((item, i) => {
      const lines = this.wrap(item, this.fonts.poppins, size, this.width - indent);
      this.ensure(lineHeight * Math.min(lines.length, 2));
      const marker = opts.numbered ? `${i + 1}.` : "•";
      this.drawText(marker, this.left + 2, this.y, this.fonts.poppinsSemi, size, GREEN);
      for (const line of lines) {
        this.ensure(lineHeight);
        this.drawText(line, this.left + indent, this.y, this.fonts.poppins, size, INK);
        this.y -= lineHeight;
      }
      this.y -= 3;
    });
    this.y -= 4;
  }

  /** Label / value rows, the member-details block every template starts with. */
  keyValues(rows: [string, string][], labelWidth = 150) {
    const size = 10.5;
    for (const [label, value] of rows) {
      const lines = this.wrap(value || "—", this.fonts.poppins, size, this.width - labelWidth - 8);
      const h = Math.max(lines.length, 1) * size * 1.45 + 10;
      this.ensure(h);
      this.drawText(label, this.left, this.y, this.fonts.poppinsSemi, size - 0.5, MUTED);
      let ly = this.y;
      for (const line of lines) {
        this.drawText(line, this.left + labelWidth, ly, this.fonts.poppins, size, INK);
        ly -= size * 1.45;
      }
      this.y -= h;
      this.page.drawLine({ start: { x: this.left, y: this.y + 6 }, end: { x: this.right, y: this.y + 6 }, thickness: 0.6, color: LINE });
      this.y -= 4;
    }
    this.y -= 6;
  }

  /** A ruled table. Column widths are fractions of the text width. Empty cells are left to fill in by hand. */
  table(headers: string[], rows: string[][], fractions: number[], opts: { size?: number; minRowHeight?: number } = {}) {
    const size = opts.size ?? 9.5;
    const pad = 5;
    const widths = fractions.map((f) => f * this.width);
    const drawRow = (cells: string[], header: boolean) => {
      const font = header ? this.fonts.poppinsSemi : this.fonts.poppins;
      const wrapped = cells.map((c, i) => this.wrap(c || "", font, size, widths[i] - pad * 2));
      const h = Math.max(opts.minRowHeight ?? 0, Math.max(...wrapped.map((w) => w.length)) * size * 1.4 + pad * 2);
      this.ensure(h);
      const top = this.y;
      if (header) this.page.drawRectangle({ x: this.left, y: top - h, width: this.width, height: h, color: PANEL });
      let x = this.left;
      wrapped.forEach((lines, i) => {
        let ly = top - pad - size;
        for (const line of lines) {
          this.drawText(line, x + pad, ly, font, size, header ? GREEN : INK);
          ly -= size * 1.4;
        }
        x += widths[i];
      });
      // Grid lines.
      this.page.drawRectangle({ x: this.left, y: top - h, width: this.width, height: h, borderColor: LINE, borderWidth: 0.7 });
      x = this.left;
      for (const w of widths.slice(0, -1)) {
        x += w;
        this.page.drawLine({ start: { x, y: top }, end: { x, y: top - h }, thickness: 0.7, color: LINE });
      }
      this.y = top - h;
    };
    // A short table (the office-use boxes, the nominee rows) is kept on one page with its header.
    const estimate = (cells: string[], font: PDFFont) =>
      Math.max(
        opts.minRowHeight ?? 0,
        Math.max(...cells.map((c, i) => this.wrap(c || "", font, size, widths[i] - pad * 2).length)) * size * 1.4 + pad * 2,
      );
    const total = estimate(headers, this.fonts.poppinsSemi) + rows.reduce((h, r) => h + estimate(r, this.fonts.poppins), 0);
    if (total < 320) this.ensure(total + 4);
    drawRow(headers, true);
    for (const r of rows) drawRow(r, false);
    this.y -= 14;
  }

  /** "Label: ______" lines for handwriting. */
  signLines(labels: string[]) {
    // A signature block is never split across pages.
    this.ensure(labels.length * 30 + 4);
    for (const label of labels) {
      this.ensure(30);
      this.y -= 10;
      this.drawText(`${label}:`, this.left, this.y, this.fonts.poppinsSemi, 10.5, INK);
      const start = this.left + 140;
      this.page.drawLine({ start: { x: start, y: this.y - 2 }, end: { x: this.right, y: this.y - 2 }, thickness: 0.8, color: MUTED });
      this.y -= 20;
    }
    this.y -= 4;
  }

  /** A tick box drawn as a square (the brand fonts have no ☐ glyph), followed by wrapped text. */
  checkbox(text: string) {
    const size = 10.5;
    const lines = this.wrap(text, this.fonts.poppins, size, this.width - 22);
    this.ensure(lines.length * size * 1.45);
    this.page.drawRectangle({ x: this.left + 1, y: this.y - 2, width: 10, height: 10, borderColor: INK, borderWidth: 0.9 });
    for (const line of lines) {
      this.drawText(line, this.left + 20, this.y, this.fonts.poppins, size, INK);
      this.y -= size * 1.45;
    }
    this.y -= 6;
  }

  /** Writes the footer on every page and returns the finished file. */
  async finish(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const text = `${this.footerText}  ·  Page ${i + 1} of ${pages.length}`;
      const size = 7.5;
      const w = this.fonts.poppins.widthOfTextAtSize(text, size);
      p.drawLine({ start: { x: this.left, y: 38 }, end: { x: this.right, y: 38 }, thickness: 0.5, color: LINE });
      p.drawText(text, { x: (A4[0] - w) / 2, y: 26, size, font: this.fonts.poppins, color: MUTED });
    });
    return this.doc.save();
  }
}

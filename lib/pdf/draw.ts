// Shared drawing helpers for the generated documents.

import "server-only";

import type { PDFFont, PDFPage, RGB } from "pdf-lib";

/**
 * Draws the naira sign, and returns the width it used.
 *
 * Neither Lora nor Poppins carries U+20A6, so the character renders as an empty box. The fonts
 * that do carry it are several times the size and would not match the surrounding type anyway.
 * The sign is a capital N crossed by two bars, so it is drawn: the N comes from the same font at
 * the same size, and the bars are ruled across it. That keeps the weight and colour consistent
 * with the text beside it, and adds nothing to the repository.
 */
export function drawNaira(
  page: PDFPage,
  opts: { x: number; y: number; size: number; font: PDFFont; color: RGB },
): number {
  const { x, y, size, font, color } = opts;
  page.drawText("N", { x, y, size, font, color });

  const nWidth = font.widthOfTextAtSize("N", size);
  const overhang = size * 0.055;
  const thickness = Math.max(size * 0.06, 0.6);
  for (const fraction of [0.3, 0.46]) {
    const barY = y + size * fraction;
    page.drawLine({
      start: { x: x - overhang, y: barY },
      end: { x: x + nWidth + overhang, y: barY },
      thickness,
      color,
    });
  }
  return nWidth + overhang;
}

// The brand fonts, read from the repo for server-side PDF generation.
//
// They are committed rather than fetched: Google Fonts is not reachable at request time inside a
// serverless function, and a document that silently falls back to Helvetica is not the
// cooperative's document. Both families are under the SIL Open Font License (assets/fonts/OFL.txt).

import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

export type BrandFonts = Record<"loraBold" | "loraRegular" | "poppins" | "poppinsSemi", Buffer>;

/** Read once per server instance: the files never change and each is about 150KB. */
let cache: Promise<BrandFonts> | null = null;

export function embeddableFonts(): Promise<BrandFonts> {
  cache ??= (async () => {
    const [loraBold, loraRegular, poppins, poppinsSemi] = await Promise.all([
      readFile(path.join(FONT_DIR, "Lora_700Bold.ttf")),
      readFile(path.join(FONT_DIR, "Lora_400Regular.ttf")),
      readFile(path.join(FONT_DIR, "Poppins_400Regular.ttf")),
      readFile(path.join(FONT_DIR, "Poppins_600SemiBold.ttf")),
    ]);
    return { loraBold, loraRegular, poppins, poppinsSemi };
  })().catch((err) => {
    cache = null;
    throw err;
  });
  return cache;
}

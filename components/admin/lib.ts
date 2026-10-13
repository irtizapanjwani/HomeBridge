// Small pure helpers shared by the admin screens: formatting, dates, CSV and downloads.

import { TODAY } from "@/lib/admin-data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const naira = (n: number, dp = 0) =>
  "₦" + n.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const nairaAuto = (n: number) => naira(n, Number.isInteger(n) ? 0 : 2);

export const num = (n: number) => n.toLocaleString("en-GB");

const SYMBOL: Record<string, string> = { NGN: "₦", GBP: "£", USD: "$", EUR: "€" };
export const money = (amount: number, currency: string) =>
  (SYMBOL[currency] ?? currency + " ") +
  amount.toLocaleString("en-GB", { minimumFractionDigits: currency === "NGN" && Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 });

export const pct = (n: number, dp = 1) => `${(n * 100).toFixed(dp)}%`;

/** ISO yyyy-mm-dd → "1 Oct 2026" (or "1 Oct" when short). Parsed by hand so server and client agree. */
export function fmtDate(iso: string | undefined, short = false) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  if (!d) return `${MONTHS[m - 1]} ${y}`;
  const thisYear = Number(TODAY.slice(0, 4));
  return short && y === thisYear ? `${d} ${MONTHS[m - 1]}` : `${d} ${MONTHS[m - 1]} ${y}`;
}

export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number) {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const ta = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const tb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((tb - ta) / 86_400_000);
}

/** Whole months from a to b (b later), counting a partial month as not complete. */
export function monthsBetween(a: string, b: string) {
  let m = (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
  if (+b.slice(8, 10) < +a.slice(8, 10)) m -= 1;
  return m;
}

/** Working days from a to b (Mon–Fri only, no public holidays). */
export function workingDaysBetween(a: string, b: string) {
  let n = 0;
  let cur = a;
  while (cur < b) {
    cur = addDays(cur, 1);
    const dow = new Date(cur + "T00:00:00Z").getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

export const maxIso = (a: string, b: string) => (a > b ? a : b);

export function nowStamp() {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ---------------- CSV ---------------- */

export const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (columns: string[], rows: (string | number)[][]) =>
  "﻿" + [columns, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

const htmlCell = (v: string | number) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const toXls = (columns: string[], rows: (string | number)[][]) =>
  `<html><head><meta charset="utf-8"></head><body><table border="1">${[columns, ...rows]
    .map((row, i) => `<tr>${row.map((c) => (i ? `<td>${htmlCell(c)}</td>` : `<th>${htmlCell(c)}</th>`)).join("")}</tr>`)
    .join("")}</table></body></html>`;

/** Parse CSV text (handles quoted cells). Returns rows of trimmed cells, empty lines dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Opens a print-ready page (save as PDF from the browser print dialog). */
export function printTable(title: string, subtitle: string, columns: string[], rows: (string | number)[][]) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${htmlCell(title)}</title>
<style>body{font:12px/1.4 system-ui,sans-serif;color:#1a1d1a;margin:24px}h1{font:700 20px Georgia,serif;color:#17452f;margin:0 0 4px}
p{color:#5a5f5a;margin:0 0 16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e3dcc3;padding:5px 7px;text-align:left}
th{background:#f7f0da;font-size:11px;text-transform:uppercase;letter-spacing:.04em}</style></head><body>
<h1>${htmlCell(title)}</h1><p>${htmlCell(subtitle)}</p><table><thead><tr>${columns.map((c) => `<th>${htmlCell(c)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${htmlCell(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Reference as letters and digits only, so "HB ED UK 000003" matches HB-ED-UK-000003. */
export const normRef = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

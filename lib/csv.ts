// A CSV reader for the Google Form export.
//
// Written out rather than pulled from a package: the input is a spreadsheet export, which means
// quoted fields, commas and line breaks inside answers, and doubled quotes. Splitting on commas
// would mangle any address or long answer.

/**
 * Reads CSV text into rows of cells.
 *
 * Handles quoted fields, escaped quotes (""), and CRLF or LF line endings. A trailing newline
 * does not produce an empty final row.
 */
export function parseCsv(text: string): string[][] {
  // A byte-order mark at the start of a Google Sheets export would otherwise become part of the
  // first header, so no column would match it.
  const input = text.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      // Treat CRLF as one break rather than two.
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

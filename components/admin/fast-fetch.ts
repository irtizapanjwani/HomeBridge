"use client";

// Makes moving between admin sections instant.
//
// Most sections load their data from /api/admin/... when they open, and each of those requests
// has to wake a Vercel function and reach the database, which can take a few seconds. So:
//   1. Right after sign-in, the data for every section is loaded quietly in the background.
//   2. A section that opens within the next 2 minutes gets that data straight away, without waiting.
//   3. Pointing at a section in the menu refreshes its data, so it is ready by the time you click.
//   4. Any change (approve, save, send, delete…) clears the stored data, so nothing out of date
//      is shown after an action. The next read goes to the server again.
// Only JSON GETs to /api/admin are kept; downloads and anything else go straight to the network.

const FRESH_MS = 2 * 60_000;

type Entry = { at: number; res: Promise<Response> };
const store = new Map<string, Entry>();
let installed = false;
let realFetch: typeof fetch;

const adminPath = (input: RequestInfo | URL): string | null => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin || !u.pathname.startsWith("/api/admin/")) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
};

/** Fetch one admin GET from the network and keep it if it is a good JSON answer. */
function load(path: string): Promise<Response> {
  const res = realFetch(path, { cache: "no-store" }).then((r) => {
    const json = (r.headers.get("content-type") ?? "").includes("application/json");
    if (!r.ok || !json) store.delete(path);
    return r;
  });
  res.catch(() => store.delete(path));
  store.set(path, { at: Date.now(), res });
  return res;
}

export function installFastFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  realFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const path = adminPath(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (!path) return realFetch(input, init);

    if (method !== "GET") {
      // A change: forget everything, then do it. Clear again once it is done, in case a background
      // load started meanwhile picked up the old data.
      store.clear();
      const done = realFetch(input, init);
      done.finally(() => store.clear()).catch(() => {});
      return done;
    }

    const hit = store.get(path);
    const res = hit && Date.now() - hit.at < FRESH_MS ? hit.res : load(path);
    // Each caller reads its own copy of the body.
    return res.then((r) => r.clone());
  };
}

/** Load these in the background if they are not already fresh. */
export function prefetchAdmin(paths: string[]) {
  if (!installed) return;
  for (const p of paths) {
    const hit = store.get(p);
    if (!hit || Date.now() - hit.at >= FRESH_MS / 2) void load(p).catch(() => {});
  }
}

/** Forget everything (used on sign-out). */
export function clearAdminCache() {
  store.clear();
}

// The public address of the site, for links inside emails.
//
// SITE_URL wins when set (e.g. "https://www.homebridgecooperative.org"), so a link in an email always
// points at the real domain even if the officer who triggered it was working on a *.vercel.app
// preview. Without it, the address the request came in on is used, which is what the password-reset
// email has always done.

export function siteUrl(req: Request): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(req.url).origin;
}

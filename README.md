# HomeBridge Cooperative — website

Next.js (App Router) + React + Tailwind CSS v4 + TypeScript.

| Route | What it is |
| --- | --- |
| `/` | Public website (single page with sections: how it works, joining & costs, share calculator, projects, money safeguards, leadership, events, FAQ, register interest) |
| `/admin` | Admin back office (KYC queue, payment matching, maker-checker approvals, report exports, audit log). **Route-only:** not linked from the public site, `noindex` via meta tag and `X-Robots-Tag` header, and not listed in `robots.txt`. |
| `/api/register` | Receives "Register your interest" submissions |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  and  http://localhost:3000/admin
npm run build && npm start   # production
```

## Editing content

- Public-site copy: `lib/content.ts` (prices, FAQs, projects, events, contact details).
- Online launch time: set `LAUNCH.timeUK` in `lib/content.ts` (e.g. `"18:00"`) to show times in Nigeria, UK, New York, Dubai and the visitor's own time zone, plus a countdown.
- Admin sample data: `lib/admin-data.ts`.

## Before going live

- **Register-interest storage:** set `REGISTER_WEBHOOK_URL` (Zapier/Make hook, Google Apps Script, CRM endpoint…) and each submission is POSTed there as JSON. Without it, submissions are only written to the server log.
- **Admin authentication:** `/admin` is hidden, not protected. It shows sample data and runs entirely in the browser. Put real sign-in (with 2FA) and a backend in front of it before using it with member data.
- Replace the illustrated project images and initials avatar with real photos when available.
- Publish the full privacy notice (the footer currently opens a summary).

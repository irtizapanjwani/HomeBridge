# HomeBridge Cooperative — website

Next.js (App Router) + React + Tailwind CSS v4 + TypeScript.

| Route | What it is |
| --- | --- |
| `/` | Public website (single page with sections: how it works, joining & costs, share calculator, projects, money safeguards, leadership, events, FAQ, register interest) |
| `/admin` | Admin back office (KYC queue, payment matching, maker-checker approvals, report exports, audit log). **Route-only:** not linked from the public site, `noindex` via meta tag and `X-Robots-Tag` header, and not listed in `robots.txt`. |
| `/api/apply` | Receives membership applications and stores them in MongoDB |
| `/api/admin/login` | Signs in and out of the back office |

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

## Database

Registrations are stored in MongoDB. The VEKAT site (`vekat.org`) points at the **same** database, so
someone who registers on both has one record and one reference.

```
people      one document per human: the reference everything else is filed under
members     a HomeBridge membership application
enquiries   a short registration from the VEKAT site
```

People are matched across the sites by email or phone (`lib/members.ts`), so a second submission
attaches to the person the first one created rather than making a duplicate. Indexes are created on
first write — there is no migration step to run.

Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `MONGODB_DB` and `ADMIN_PASSWORD`.

## Before going live

- **Admin accounts:** `/admin` now asks for one shared password (`ADMIN_PASSWORD`). That keeps the page
  closed to anyone with the URL, but it cannot tell two officers apart, so the audit log cannot name
  who did what. Give each officer their own account with 2FA before this handles live member data.
- **ID numbers:** applications store a BVN, NIN or passport number. It is never logged and never sent to
  the browser (the admin screen shows only the last four digits), but it is in the database — so restrict
  who holds the Atlas credentials, turn on IP access lists, and agree a retention period with the client.
- **Other admin screens:** only the Applications queue reads real data. Contributions, the member
  register, fees, withdrawals, meetings, projects, reports and the audit log still run on the sample
  data in `lib/admin-data.ts`.
- Replace the illustrated project images and initials avatar with real photos when available.
- Publish the full privacy notice (the footer currently opens a summary).

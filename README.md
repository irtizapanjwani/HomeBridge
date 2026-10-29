# HomeBridge Cooperative — website

Next.js (App Router) + React + Tailwind CSS v4 + TypeScript.

| Route | What it is |
| --- | --- |
| `/` | Public website (single page with sections: how it works, joining & costs, share calculator, projects, money safeguards, leadership, events, FAQ, register interest) |
| `/admin` | Admin back office (KYC queue, payment matching, maker-checker approvals, report exports, audit log). **Route-only:** not linked from the public site, `noindex` via meta tag and `X-Robots-Tag` header, and not listed in `robots.txt`. |
| `/api/apply` | Receives membership applications and stores them in MongoDB |
| `/api/admin/login` | Signs in and out of the back office |
| `/app` | A member's own account: their application, its status and their joining fee |
| `/api/member/login` | Signs members in and out |

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

Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `MONGODB_DB`, `MEMBER_SESSION_SECRET`,
`ADMIN_PASSWORD` and `DOCUMENTS_KEY` (`openssl rand -base64 32`; keep a safe copy — it decrypts every
stored ID document).

## Member accounts

Applicants set a password on the first step of `/register`, and are signed in as soon as they
submit. They sign in again at `/app` with that email address and password.

Passwords are hashed with scrypt and a per-password salt (`lib/member-auth.ts`). The plain password
is never stored, never logged, and is deliberately kept out of the draft the form saves in the
browser — so a half-finished application reopens at the first step.

`/app` shows the member's real application: its status, their details, nominees and the joining fee
they said they paid. Shares, contributions and statements are still the sample figures from
`lib/member-data.ts`, because no share data exists yet.

## Before going live

- **Admin accounts:** `/admin` now asks for one shared password (`ADMIN_PASSWORD`). That keeps the page
  closed to anyone with the URL, but it cannot tell two officers apart, so the audit log cannot name
  who did what. Give each officer their own account with 2FA before this handles live member data.
- **ID numbers:** this site's form never asks for one — it records which ID the applicant will use, and the
  number is collected later at verification. Registrations coming from the VEKAT site *do* carry a number,
  so the database holds some: it is never logged and never sent to the browser (the admin screen shows only
  the last four digits), but restrict who holds the Atlas credentials, turn on IP access lists, and agree a
  retention period with the client.
- **Other admin screens:** only the Applications queue reads real data. Contributions, the member
  register, fees, withdrawals, meetings, projects, reports and the audit log still run on the sample
  data in `lib/admin-data.ts`.
- Replace the illustrated project images and initials avatar with real photos when available.
- Publish the full privacy notice (the footer currently opens a summary).

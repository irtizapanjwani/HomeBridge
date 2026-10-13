// All public-site copy lives here so it can be edited without touching layout code.

export const CONTACT = {
  email: "info@homebridge.org",
  phoneDisplay: "0810 583 2602",
  phoneIntl: "+234 810 583 2602",
  phoneHref: "tel:+2348105832602",
  whatsapp: "https://wa.me/2348105832602",
  address: ["4 Eregbowa Street, off Trinity Road,", "Ugbor Quarters, Benin City, Edo State, Nigeria"],
};

/** Online launch — Saturday 3 October 2026. Set LAUNCH_TIME_UK (HH:MM, UK time) once confirmed. */
export const LAUNCH = {
  dateLabel: "Saturday 3 October 2026",
  year: 2026,
  monthIndex: 9, // October
  day: 3,
  timeUK: "" as string, // e.g. "18:00"
};

export const SHARE_MESSAGE =
  "HomeBridge Cooperative — own real businesses at home with Africans abroad. Abroad and at home, we build together.";

/** Public pages, from the brief's site map. */
export const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/join", label: "Who can join" },
  { href: "/your-money", label: "Your money" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/projects", label: "Projects" },
  { href: "/governance", label: "Governance" },
  { href: "/faq", label: "FAQ" },
];

export const NAV_MORE = [
  { href: "/events", label: "Events" },
  { href: "/documents", label: "Documents" },
  { href: "/chapters", label: "Chapters" },
  { href: "/contact", label: "Contact" },
];

/** Kept as a fallback entry point until /register is live (brief p.5). */
export const GOOGLE_FORM_URL = "https://forms.gle/wfdLDXrTbe4zw6t39";

export const RISK_NOTICE =
  "Membership opens after registration with the Edo State and FCT Directors of Cooperatives and legal sign-off. No guaranteed returns. Not a savings or deposit scheme.";

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "pcm", label: "Pidgin (soon)" },
  { value: "ha", label: "Hausa (soon)" },
  { value: "yo", label: "Yoruba (soon)" },
  { value: "ig", label: "Igbo (soon)" },
  { value: "bin", label: "Edo (soon)" },
];

export const MONEY_STEPS = [
  { title: "You pay", text: "by transfer, card or USSD. Your member number is your reference." },
  { title: "The cooperative’s own bank account", text: "receives your shares. Never cash, never a person." },
  { title: "Named businesses", text: "get it in stages, as milestones are met." },
];

export const WE_ARE = [
  "A cooperative that owns real businesses",
  "Run to professional standards",
  "Equal votes for members at home and abroad",
  "Open about every naira",
];
export const WE_ARE_NOT = ["A charity", "A money-transfer service", "A savings or loan scheme", "A promise of fixed returns"];

export const FOUR_PARTS = [
  { icon: "people", title: "Members own the cooperative", text: "You buy shares, you vote at the annual meeting, you choose the board." },
  { icon: "building", title: "The cooperative owns businesses", text: "Each business is its own company. The cooperative owns most of it; a local operator runs it." },
  { icon: "chart", title: "VEKAT runs the work", text: "The appointed manager: runs registration and ID checks, checks projects, keeps the accounts and runs your dashboard. Never holds share money." },
  { icon: "globe", title: "Chapters bring people in", text: "HomeBridge Edo, Abuja, UK and more recruit members and find skills. No access to money." },
] as const;

export const MEMBER_TYPES = [
  { name: "Home member", tag: "Nigeria", who: "Living in Nigeria", fee: "₦10,000", feeNote: "to join, once", perk: "Shares from ₦5,000 a month", theme: "forest" },
  { name: "Diaspora member", tag: "Abroad", who: "Africans living abroad", fee: "£10", feeNote: "or $ / € equivalent to join, once", perk: "Shares from £25 a month", theme: "paper" },
  { name: "Founding member", tag: "Founder", who: "Anyone joining in the first 12 months", fee: "£1,000+", feeNote: "or ₦2m+ founding block, plus the joining fee", perk: "First 12 months only", theme: "gold" },
  { name: "Professional member", tag: "Pro", who: "Doctors, accountants, engineers, lawyers and others", fee: "Up to ½", feeNote: "of your shares paid in volunteered skills hours", perk: "Your expertise counts", theme: "clay" },
  { name: "Group member", tag: "Group", who: "Hometown unions, churches, mosques, businesses", fee: "One vote", feeNote: "through one named representative", perk: "Same joining fee", theme: "ink" },
] as const;

export const SIMPLE_RULES = [
  "One member, one vote. More money means a bigger share of profit, never more control.",
  "No one may own more than a fifth of all shares.",
  "Shares can be withdrawn after 3 years, with 6 months’ written notice.",
  "Every member is identity-checked: BVN or NIN at home, Non-Resident BVN or passport abroad.",
  "The joining fee is paid once you are approved, to VEKAT Group Ltd, the cooperative’s manager. It covers registration, identity checks and your member pack. It is not a share and is not refundable.",
  "Your shares are paid only into the cooperative’s own bank accounts, with your member number as the reference.",
];

export const WHAT_YOU_GET = [
  "Part-ownership of real businesses, and a share of profits when they make money",
  "A vote at the annual meeting, online or in person",
  "A say in which projects your shares back, on your own dashboard",
  "First chance to work in, supply or buy from the businesses",
  "Training and a network of members at home and abroad",
];

export const PROJECTS = [
  { art: "food", place: "Benin City, Edo", title: "Food processing", text: "Garri, cassava and plantain flour for home and diaspora shops." },
  { art: "health", place: "Abuja FCT", title: "Health services and shops to let", text: "Diagnostics or pharmacy, plus small shops and offices to let." },
  { art: "solar", place: "Edo and Abuja", title: "Solar kits", text: "Solar kits leased to members’ small businesses in both locations." },
] as const;

export const FIVE_CHECKS = [
  ["Owner’s own money in", "the local operator puts in 10–20% of the cost."],
  ["Real customers", "signed buyers, orders or a working trial."],
  ["A clear path to profit", "breaking even within 2 years on a careful plan."],
  ["Clean papers", "land, lease and licences checked."],
  ["Money control", "bank payments only, with two signatures."],
];

export const TARGETS = [
  { value: "300", label: "home members" },
  { value: "100", label: "diaspora members" },
  { value: "50", label: "founding members" },
  { value: "3–4", label: "businesses running" },
  { value: "20+", label: "local jobs" },
  { value: "Monthly", label: "reports, plus first audit" },
];

export const SAFEGUARDS = [
  { title: "No cash", text: "Bank accounts in the Society’s name only. Suppliers are paid directly, never through a personal account." },
  { title: "Two signatures", text: "On every payment — one from home, one from the diaspora." },
  { title: "Spending limits", text: "The bigger the payment, the more people must approve it." },
  { title: "Five checks first", text: "Operator’s own money in, real customers, path to profit, clean papers, bank-only payments." },
  { title: "Independent audit", text: "Every year by an ICAN-registered auditor, sent to every member and checked by the Audit Committee." },
  { title: "Monthly reports", text: "Money in, money spent and progress on every project, on your dashboard." },
];

export const GOVERNANCE = [
  { who: "Annual meeting", made: "All members, one vote each, online or in person", job: "Confirms the Chairman, elects the board and Audit Committee, approves accounts, the investment policy and projects over ₦50m" },
  { who: "Board", made: "9 people: Chairman, 3 home members, 3 diaspora members, 1 independent accountant, 1 non-voting VEKAT seat", job: "Strategy, approving projects, overseeing VEKAT" },
  { who: "Audit committee", made: "3 members who are not on the board, at least one from home and one from the diaspora", job: "Can inspect every book and record at any time, and reports straight to members" },
  { who: "Local chapters", made: "HomeBridge Edo, Abuja, UK and more", job: "Recruit members, find skills and projects" },
  { who: "VEKAT Group", made: "Appointed manager under a written contract, reviewed by members at least every 3 years", job: "Day-to-day running, registration and identity checks. Receives the joining fee; never holds share money" },
];

export const LEADERS = [
  {
    kind: "person",
    initials: "VE",
    name: "Victor Evbuomwan",
    role: "Founding Chairman and Initiator",
    text: "Started HomeBridge and is Founding Chairman until the first AGM, where members vote to confirm him or elect another Chairman. As he also leads VEKAT Group, he never votes on VEKAT’s appointment, fees or contract.",
  },
  {
    kind: "org",
    initials: "VEKAT",
    name: "VEKAT Group Ltd (Nigeria)",
    role: "Initiator and appointed manager",
    text: "Runs registration and identity checks, finds and checks projects, keeps the accounts and runs the members’ dashboard, under a contract members review. Receives the joining fee; never holds share money or signs on the cooperative’s accounts.",
  },
  {
    kind: "members",
    initials: "",
    name: "The members",
    role: "The owners",
    text: "Through the annual meeting and the board, members make the big decisions.",
  },
] as const;

export const OTHER_EVENTS = [
  { title: "UK webinar", where: "Online" },
  { title: "Members’ meeting", where: "Benin City" },
  { title: "Members’ meeting", where: "Abuja" },
];

export const NEWS = [
  { meta: "30 September 2026 · Notice", title: "HomeBridge cooperative model published (version 7)" },
  { meta: "Notice", title: "Expressions of interest open after the online launch" },
];

export const DOCS = [
  { name: "HomeBridge cooperative model (v7)", status: "PDF", available: true },
  { name: "Draft bye-laws (constitution), draft 3", status: "After legal review", available: false },
  { name: "Membership registration form", status: "PDF", available: true },
  { name: "Annual report", status: "After first year", available: false },
  { name: "Audited accounts", status: "After first audit", available: false },
];

export const FAQS = [
  ["Is this an investment with guaranteed returns?", "No. You become a part-owner of real businesses. When they make a profit, members share it after the yearly audit and AGM approval. Nothing is guaranteed, and profits depend on how the businesses perform."],
  ["Who can join?", "Anyone aged 18 or over, of good character, who passes our identity checks and has a link to Edo State or Abuja FCT: you live there, or you or your family own or hold land or a home there."],
  ["I am not in Edo or Abuja. Can I join?", "Yes, if you or your family have land or a home in Edo or the FCT, wherever you live. If not, join the Supporter list for your state or country and be first in when it opens."],
  ["How much does it cost to join?", "A one-off joining fee of £10 for members abroad or ₦10,000 for members in Nigeria, paid once you are approved. It goes to VEKAT Group Ltd, the cooperative’s appointed manager, for registration, identity checks and your member pack. It is not a share and is not refundable."],
  ["How much is a share?", "Every share costs ₦1,000, whether you live in Benin City, Abuja or Birmingham. Members abroad pay in £, $ or €, converted at the bank rate on the day received."],
  ["Who holds my money?", "Your shares go only into the cooperative’s own bank accounts. VEKAT, chapters and individuals never hold share money, and every outgoing payment needs two signatures. The only payment that goes to VEKAT is the one-off joining fee."],
  ["Can I get my money back?", "Shares can be withdrawn after 3 years, with 6 months’ written notice, at the value in the last audited accounts. This protects the businesses from too many people leaving at once."],
  ["Does more money give me more votes?", "No. One member, one vote. More shares mean a bigger share of profit, never more control. No one may own more than a fifth of all shares."],
  ["What happens to my shares if I die?", "You name one or more nominees when you join. The value of your shares passes to them."],
  ["What if I stop paying?", "After 12 months without a contribution we remind you. After 3 more months you may become dormant, with no vote, until you start again."],
  ["How do members abroad pay?", "Joining fee by card, Apple Pay or Google Pay. Shares by bank transfer into the cooperative’s US dollar or pound sterling account. Your member number is always your payment reference."],
  ["When can I join?", "Membership opens after the cooperative is registered in Edo State and the FCT and a lawyer has signed off. Register your interest now and we will tell you first."],
];

/** What happens after someone registers interest — replaces the old "preview joining steps" link. */
export const JOIN_STEPS = [
  { title: "Create your account", text: "With your phone number and a one-time code. No password to remember." },
  { title: "Choose how you join", text: "Home, diaspora, founding, professional or group member." },
  { title: "Check your identity", text: "BVN or NIN at home; Non-Resident BVN or passport abroad, plus a quick selfie." },
  { title: "Officer review", text: "Usually within 2 working days, and always within 30 days. We message you on WhatsApp." },
  { title: "Pay the joining fee", text: "£10 or ₦10,000, once you are approved. Get your member number, then buy shares at your own pace." },
];

/** Bye-law 5.2 residence test. "none" goes to the Supporter list, not membership. */
export const ROUTE_OPTIONS = [
  { value: "lives", label: "I live in Edo State or Abuja FCT" },
  { value: "land", label: "I live elsewhere, but I or my family own or hold land or a home in Edo or FCT" },
  { value: "other", label: "Another link to Edo or FCT (sent for Director approval)" },
  { value: "none", label: "None of these yet: add me to the Supporter list" },
] as const;

/** Bye-law 13A: long-term investment portfolio. Bracketed limits are proposals for members to decide. */
export const PORTFOLIO_RULES = [
  { big: "≤ 20%", title: "of the Society’s total funds", text: "can be held in the portfolio." },
  { big: "≤ 10%", title: "of the portfolio in one company", text: "so no single company can sink it." },
  { big: "Advice first", title: "", text: "Every trade needs written advice from an independent SEC-registered adviser." },
  { big: "Our name", title: "", text: "Held through the Society’s own CSCS account and a registered custodian. Never in a person’s name." },
  { big: "Never touched", title: "", text: "The withdrawal reserve, the legal reserve fund and joining fees." },
  { big: "Quarterly", title: "", text: "Holdings and value on your dashboard, checked by the Audit Committee." },
];

export const PORTFOLIO_NOT = ["Borrowing to invest", "Derivatives or futures", "Currency trading", "Crypto", "Quick in-and-out trades"];

export const MEMBER_TYPE_OPTIONS = ["Home member", "Diaspora member", "Founding member", "Professional member", "Group member", "Not sure yet"];
export const HEARD_OPTIONS = ["WhatsApp", "Friend or family", "Church, mosque or union", "Zoom launch", "Social media", "Other"];

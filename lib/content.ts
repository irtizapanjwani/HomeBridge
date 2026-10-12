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

export const NAV = [
  { href: "#how", label: "How it works", mobile: "How it works" },
  { href: "#join", label: "Join", mobile: "Join and costs" },
  { href: "#projects", label: "Projects", mobile: "Projects" },
  { href: "#trust", label: "Your money", mobile: "How your money is protected" },
  { href: "#events", label: "Events", mobile: "Events" },
  { href: "#faq", label: "FAQ", mobile: "FAQ" },
];

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
  { title: "The cooperative’s own bank account", text: "receives it. Never VEKAT, never a person." },
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
  { icon: "chart", title: "VEKAT runs the work", text: "Checks projects, keeps accounts and runs your dashboard for a published fee. Never holds your money." },
  { icon: "globe", title: "Chapters bring people in", text: "HomeBridge Edo, Abuja, UK and more recruit members and find skills. No access to money." },
] as const;

export const MEMBER_TYPES = [
  { name: "Home member", who: "Living in Nigeria (Edo and Abuja first)", price: ["₦10,000", " to join"], extra: ["Shares from ", "₦5,000", "/month"] },
  { name: "Diaspora member", who: "Africans living abroad", price: ["£5", " (or $/€) to join"], extra: ["Shares from ", "£25", "/month"] },
  { name: "Founding member", who: "Anyone joining in the first 12 months", price: ["", "Joining fee plus a founding block of"], extra: ["", "£1,000 or ₦2m", " or more"], featured: true },
  { name: "Professional member", who: "Doctors, accountants, engineers, lawyers and others", price: ["", "Up to half of shares may be paid in"], extra: ["", "volunteered skills hours", ""] },
  { name: "Group member", who: "Hometown unions, churches, mosques, businesses", price: ["£5 / ₦10,000", " per group"], extra: ["", "One vote", " per group"] },
];

export const SIMPLE_RULES = [
  "One member, one vote. More money means a bigger share of profit, never more control.",
  "No one may own more than a fifth of all shares.",
  "Shares can be cashed in after 3 years, with 6 months’ notice.",
  "Every member is identity-checked: BVN or NIN at home, Non-Resident BVN or passport abroad.",
  "The joining fee covers registration, identity checks and your member pack. It is not a share and is not refundable.",
];

export const WHAT_YOU_GET = [
  "Part-ownership of real businesses, and a share of profits when they make money",
  "A vote at the annual meeting, online or in person",
  "A say in which projects your shares back, on your own dashboard",
  "First chance to work in, supply or buy from the businesses",
  "Training and a network of members at home and abroad",
];

export const PROFIT_SPLIT = [
  { pct: "40%", text: "of yearly profit shared with members after the audit" },
  { pct: "40%", text: "kept to grow — at least a quarter of all profit goes to the legal reserve fund" },
  { pct: "10%", text: "for member training" },
  { pct: "10%", text: "for community work" },
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
  { title: "No cash", text: "All money goes through the cooperative’s bank accounts." },
  { title: "Two signatures", text: "On every payment — one from home, one from the diaspora." },
  { title: "Spending limits", text: "Manager up to ₦2m; Chairman and Treasurer up to ₦20m; full board above." },
  { title: "Suppliers paid directly", text: "Never through personal accounts." },
  { title: "Yearly audit", text: "By an ICAN-registered firm, shared with every member." },
  { title: "Members’ dashboard", text: "Money in, money spent, progress and photos for every project." },
];

export const GOVERNANCE = [
  { who: "Annual meeting", made: "All members, one vote each, online or in person", job: "Confirms the Chairman, elects the board, approves accounts and big projects" },
  { who: "Board", made: "9 people: Chairman, 3 home members, 3 diaspora members, 1 independent accountant, 1 non-voting VEKAT seat", job: "Strategy, approving projects, overseeing VEKAT" },
  { who: "Audit committee", made: "3 members, elected separately", job: "Checks the books and reports straight to members" },
  { who: "Local chapters", made: "HomeBridge Edo, Abuja, UK and more", job: "Recruit members, find skills and projects" },
  { who: "VEKAT Group", made: "Manager under a written contract, renewed every 3 years by member vote", job: "Day-to-day running" },
];

export const LEADERS = [
  {
    kind: "person",
    initials: "VE",
    name: "Victor Evbuomwan",
    role: "Founding Chairman and Initiator",
    text: "Started HomeBridge and chairs the founding board through the first cohort. Members confirm the Chairman at the first AGM. Steps out of any board vote on VEKAT’s fees or contracts.",
  },
  {
    kind: "org",
    initials: "VEKAT",
    name: "VEKAT Group Ltd (Nigeria)",
    role: "Sponsor and manager",
    text: "Finds and checks projects, keeps the accounts and runs the members’ dashboard. Paid a published fee. Never holds members’ money.",
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
  { name: "Draft bye-laws (constitution)", status: "After legal review", available: false },
  { name: "Membership registration form", status: "PDF", available: true },
  { name: "Annual report", status: "After first year", available: false },
  { name: "Audited accounts", status: "After first audit", available: false },
];

export const FAQS = [
  ["Is this an investment with guaranteed returns?", "No. You become a part-owner of real businesses. When they make a profit, members share it after the yearly audit. Nothing is guaranteed, and profits depend on how the businesses perform."],
  ["How much does it cost to join?", "A one-off joining fee of £5 for members abroad or ₦10,000 for members in Nigeria. It covers registration, identity checks and your member pack. It is not a share and is not refundable."],
  ["How much is a share?", "Every share costs ₦1,000, whether you live in Benin City, Abuja or Birmingham. Members abroad pay in £, $ or €, converted at the rate on the day."],
  ["Who holds my money?", "Only the cooperative’s own bank accounts. VEKAT, chapters and individuals never hold members’ money. Every payment needs two signatures."],
  ["Can I get my money back?", "Shares can be cashed in after 3 years, with 6 months’ notice. This protects the businesses from too many people leaving at once."],
  ["Does more money give me more votes?", "No. One member, one vote. More shares mean a bigger share of profit, never more control. No one may own more than a fifth of all shares."],
  ["How do members abroad pay?", "By bank transfer — ideally from a Non-Resident Nigerian account — or by card or UK pay-by-bank. Your member number is your payment reference."],
  ["When can I join?", "Membership opens after the cooperative is registered in Edo State and the FCT and a lawyer has signed off. Register your interest now and we will tell you first."],
];

/** What happens after someone registers interest — replaces the old "preview joining steps" link. */
export const JOIN_STEPS = [
  { title: "Create your account", text: "With your phone number and a one-time code. No password to remember." },
  { title: "Choose how you join", text: "Home, diaspora, founding, professional or group member." },
  { title: "Check your identity", text: "BVN or NIN at home; Non-Resident BVN or passport abroad, plus a quick selfie." },
  { title: "Officer review", text: "Usually within 2 working days. We message you on WhatsApp." },
  { title: "Pay the joining fee", text: "Get your member number, then buy shares at your own pace." },
];

export const MEMBER_TYPE_OPTIONS = ["Home member", "Diaspora member", "Founding member", "Professional member", "Group member", "Not sure yet"];
export const HEARD_OPTIONS = ["WhatsApp", "Friend or family", "Church, mosque or union", "Zoom launch", "Social media", "Other"];

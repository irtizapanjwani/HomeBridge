// The wording of the declaration, from the client's 08_Member_Declaration_Form_TEMPLATE.docx. Shared
// by the printed form (lib/pdf/pack-forms.ts) and the online form in the member portal, so the two
// can never say different things.

import { JOINING_FEE } from "@/lib/settings";

export const DECLARATION_STATEMENTS: string[] = [
  "The information I gave in my application is true and complete, and I will tell HomeBridge promptly if it changes.",
  "I have received and read the Bye-laws, Member Handbook, Contribution and Payment Guide, Investment Risk Statement and Privacy Notice.",
  "I agree to abide by the Bye-laws of HomeBridge Cooperative and the lawful decisions of its General Meetings and Governing Board.",
  "I understand that my contributions buy shares, that their value can fall as well as rise, and that no return is guaranteed.",
  "I understand that the joining (registration) fee is non-refundable.",
  "I will make contributions only into HomeBridge Cooperative’s official accounts, quoting my membership number.",
  `I understand that ${JOINING_FEE.payee} manages the cooperative’s administration as its appointed manager.`,
  `I consent to HomeBridge Cooperative and ${JOINING_FEE.payee} processing my personal data as described in the Privacy Notice.`,
  "I am contributing my own funds, lawfully obtained.",
];

export const PHOTO_CONSENT = "I agree that photographs of me taken at HomeBridge events may be used in HomeBridge communications.";

// The master member register (brief p.2: "Register | Today: Manual | Change needed: Single
// database-backed register", and part of what Phase 1 delivers).
//
// A member is an applicant who has been admitted, so the register is simply the applications that
// carry a membership number. There is no second collection to keep in step with the first.

import "server-only";

import {
  LAGOS_DATE,
  ROUTE_LABEL,
  TYPE,
  chapterOf,
  idTypeOf,
  regionOf,
  routeKindOf,
  societyOf,
} from "@/lib/applications";
import type { Member } from "@/lib/admin-data";
import { type MemberDoc, collections } from "@/lib/members";

/**
 * Bye-law 6.4, as the admin screens already state it: "the person becomes a member once they are
 * entered in the register and their first share is paid". Contributions are Phase 3, so until
 * they exist nobody can be shown as fully Active without the screen telling an officer something
 * untrue. Everyone admitted reads as awaiting their first share.
 */
function statusOf(_m: MemberDoc): Member["status"] {
  return "Awaiting first share";
}

export function toMember(m: MemberDoc): Member {
  const idCheck = m.idCheck?.result;
  return {
    no: m.membership!.memberNo,
    name: [m.title, m.fullName].filter(Boolean).join(" ").trim() || m.fullName,
    type: TYPE[m.memberType] ?? "Home",
    society: societyOf(m),
    chapter: chapterOf(m),
    base: m.country === "Nigeria" ? "home" : "diaspora",
    livesIn: [m.city, m.country === "Nigeria" ? m.state : "", m.country].filter(Boolean).join(", "),
    region: regionOf(m),
    route: ROUTE_LABEL[m.route] ?? m.route ?? "",
    phone: m.whatsapp || m.contact,
    email: m.email,
    status: statusOf(m),
    joinedAt: LAGOS_DATE.format(m.membership!.admittedAt),
    ...(m.memberType === "group" && m.repName ? { groupRep: m.repName } : {}),
    kyc: {
      idType: idTypeOf(m.idChoice),
      // The officer's own check, not a provider's: there is no verification service wired up.
      provider: "Officer check",
      providerRef: m.idCheck ? `Recorded by ${m.idCheck.by}` : "Not recorded",
      liveness: "Not required",
      docMatch: idCheck === "Pass" ? "Pass" : idCheck === "Fail" ? "Fail" : "Pending",
      addressOk: false,
      result: idCheck ?? "Not started",
      ...(m.idCheck ? { reviewer: m.idCheck.by } : {}),
    },
    nominees: m.nominees.map((n) => ({ name: n.name, relationship: n.relationship, percent: n.share })),
  };
}

/** Everyone who has been admitted, newest first. */
export async function listMembers(limit = 1000): Promise<Member[]> {
  const { members } = await collections();
  const docs = await members
    .find({ "membership.memberNo": { $exists: true } }, { projection: { "receipt.data": 0 } })
    .sort({ "membership.seq": -1 })
    .limit(limit)
    .toArray();
  return docs.map(toMember);
}

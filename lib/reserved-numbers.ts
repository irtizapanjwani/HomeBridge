// Membership numbers promised to a particular person before the system went live.
//
// The brief reserves the first number: "Member 00001 is reserved for Dr Victor Evbuomwan
// (HBC-UK-26-00001)" (p.6). Without this the number would simply go to whoever happened to be
// approved first, which is not something to leave to the order of a queue.
//
// A reserved number is tied to one application reference. Approving that application issues
// exactly the number below; approving anyone else skips over the reserved values, so they can
// never be handed out by accident and never need taking back.
//
// To reserve another number, add a row. To change who a reservation belongs to, change its
// `reference`. Neither affects numbers already issued: those are immutable (brief p.6).

export type ReservedNumber = {
  /** The application this number is held for. */
  reference: string;
  /** Issued exactly as written, rather than rebuilt from the member's current chapter. */
  memberNo: string;
  /** The position in the cooperative-wide sequence that this number occupies. */
  seq: number;
  /** Who it is for, so the reason for the row is obvious a year from now. */
  who: string;
};

export const RESERVED_NUMBERS: ReservedNumber[] = [
  {
    reference: "APP-TX26BN",
    memberNo: "HBC-UK-26-00001",
    seq: 1,
    who: "Dr Victor Evbuomwan, Chairman and Initiator",
  },
];

/** Sequence positions the ordinary counter must step over. */
export const RESERVED_SEQS = new Set(RESERVED_NUMBERS.map((r) => r.seq));

/** The reservation held for an application, if there is one. */
export function reservationFor(reference: string): ReservedNumber | undefined {
  return RESERVED_NUMBERS.find((r) => r.reference === reference);
}

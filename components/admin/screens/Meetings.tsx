"use client";

import { PageHeader } from "../ui";
import { MeetingCards } from "./LiveMeetings";
import { MemberIdeasCard, OnlineVotesCard } from "./LiveVotes";

/**
 * Meetings and votes. Everything here works on live records: online votes (with proxies, 16.4),
 * member ideas, the AGM date and notice (16.3) and the quorum check (16.5). The earlier prototype
 * tools (sample AGM, sample proxies, sample motions) were removed because the live cards replace them.
 */
export function MeetingsScreen() {
  return (
    <>
      <PageHeader title="Meetings and votes" subtitle="One member, one vote (7a) · up to five proxies per holder (16.4)" />
      <OnlineVotesCard />
      <MeetingCards />
      <MemberIdeasCard />
    </>
  );
}

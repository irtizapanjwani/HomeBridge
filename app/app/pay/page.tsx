import type { Metadata } from "next";
import { PayScreen } from "@/components/member/PayScreen";

export const metadata: Metadata = { title: "Pay" };

export default function PayPage() {
  return <PayScreen />;
}

import type { Metadata, Viewport } from "next";
import { Lora, Poppins } from "next/font/google";
import "./globals.css";

// Brand fonts from the developer brief: Lora Bold for headings, Poppins for UI and labels.
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HomeBridge Cooperative — Own real businesses at home",
    template: "%s · HomeBridge Cooperative",
  },
  description:
    "HomeBridge is a member-owned cooperative. Africans abroad and people across Nigeria join as equals, pool share capital and own productive businesses together — one member, one vote.",
  applicationName: "HomeBridge",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#17452F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const bricolage = localFont({
  src: [
    { path: "./fonts/bricolage-latin.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/bricolage-latin-ext.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-bricolage",
  display: "swap",
});

const sourceSans = localFont({
  src: [
    { path: "./fonts/sourcesans-latin.woff2", weight: "200 900", style: "normal" },
    { path: "./fonts/sourcesans-latin-ext.woff2", weight: "200 900", style: "normal" },
  ],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HomeBridge Cooperative — Own real businesses at home",
    template: "%s · HomeBridge Cooperative",
  },
  description:
    "HomeBridge is a cooperative. Africans abroad and people in Nigeria buy shares, own real businesses together, and vote as equals.",
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
    <html lang="en" className={`${bricolage.variable} ${sourceSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

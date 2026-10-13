"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/projects", label: "Projects", match: (p: string) => p.startsWith("/projects") },
  { href: "/app/pay", label: "Pay", match: (p: string) => p.startsWith("/app/pay") },
  { href: "/app", label: "My account", match: (p: string) => p === "/app" },
];

/** Bottom tab bar on phones, as in the redesign's mobile screen. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-700 bg-forest-800 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="m-0 grid list-none grid-cols-4 p-0">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center text-[13.5px] font-medium no-underline ${
                  on ? "text-gold" : "text-cream hover:text-gold"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

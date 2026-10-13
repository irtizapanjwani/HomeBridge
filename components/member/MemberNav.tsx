"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS = [
  { href: "/app", label: "Dashboard", hash: "" },
  { href: "/app/pay", label: "Pay", hash: "" },
  { href: "/app#statements", label: "Statements", hash: "#statements" },
  { href: "/app#projects", label: "Projects", hash: "#projects" },
  { href: "/app#meetings", label: "Meetings", hash: "#meetings" },
  { href: "/app#profile", label: "Profile", hash: "#profile" },
];

/** Member area navigation. On phones it scrolls sideways inside its own row. */
export function MemberNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const isActive = (item: (typeof ITEMS)[number]) => {
    if (item.href === "/app/pay") return pathname.startsWith("/app/pay");
    if (pathname !== "/app") return false;
    return item.hash === hash || (item.hash === "" && !ITEMS.some((i) => i.hash && i.hash === hash));
  };

  return (
    <nav aria-label="Member area" className="-mx-[clamp(16px,4vw,28px)] overflow-x-auto px-[clamp(16px,4vw,28px)] [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="m-0 flex w-max list-none gap-1 p-0 py-1 lg:w-auto">
        {ITEMS.map((item) => {
          const on = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setHash(item.hash)}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium whitespace-nowrap no-underline transition-colors ${
                  on ? "bg-gold text-forest-900 hover:text-forest-900" : "text-cream hover:bg-forest-700 hover:text-cream"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

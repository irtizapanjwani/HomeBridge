"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Dashboard", members: false },
  { href: "/app/pay", label: "Pay", members: true },
  { href: "/app/statements", label: "Statements", members: true },
  { href: "/app/projects", label: "Projects", members: true },
  { href: "/app/meetings", label: "Meetings", members: true },
  { href: "/app/profile", label: "Profile", members: false },
];

/**
 * Member area navigation. Members see every page; applicants see Dashboard and Profile; nobody signed
 * in sees no menu. On phones it scrolls sideways inside its own row.
 */
export function MemberNav({ who }: { who: "member" | "applicant" | null }) {
  const pathname = usePathname();
  if (!who) return null;
  const items = ITEMS.filter((i) => who === "member" || !i.members);
  const isActive = (item: (typeof ITEMS)[number]) => (item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href));

  return (
    <nav aria-label="Member area" className="-mx-[clamp(16px,4vw,28px)] overflow-x-auto px-[clamp(16px,4vw,28px)] [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="m-0 flex w-max list-none gap-1 p-0 py-1 lg:w-auto">
        {items.map((item) => {
          const on = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
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

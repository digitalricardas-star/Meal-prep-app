"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today", icon: "🏠" },
  { href: "/planner", label: "Planner", icon: "📅" },
  { href: "/meals", label: "Meals", icon: "🍲" },
  { href: "/shopping", label: "Shopping", icon: "🛒" },
  { href: "/freezer", label: "Freezer", icon: "🧊" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <>
      {/* desktop top bar */}
      <header className="hidden border-b border-stone-200 bg-white md:block">
        <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-brand-700">Family Meal Prep</span>
          <nav className="flex gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  path === l.href
                    ? "font-semibold text-brand-700"
                    : "text-stone-500 hover:text-stone-800"
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white md:hidden">
        <div className="flex justify-around py-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center px-2 py-1 text-[11px] ${
                path === l.href ? "text-brand-700 font-semibold" : "text-stone-500"
              }`}
            >
              <span className="text-lg leading-none">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

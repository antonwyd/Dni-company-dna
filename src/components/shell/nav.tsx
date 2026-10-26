"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck,
  FlaskConical,
  House,
  LibraryBig,
  Menu,
  MessageSquareText,
  PenLine,
  Radar,
  Scale,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";

export type NavKey = "home" | "ask" | "capture" | "library" | "decisions" | "gaps" | "reviews" | "evaluation" | "admin";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  badge?: number;
}

const ICONS: Record<NavKey, LucideIcon> = {
  home: House,
  ask: MessageSquareText,
  capture: PenLine,
  library: LibraryBig,
  decisions: Scale,
  gaps: Radar,
  reviews: ClipboardCheck,
  evaluation: FlaskConical,
  admin: Settings2,
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.key];
        const active = isActive(pathname, item.href);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-surface font-medium text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              <Icon
                aria-hidden
                className={`size-4 shrink-0 ${active ? "text-accent" : "text-ink-3 group-hover:text-ink-2"}`}
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="tabular rounded-full bg-warn-tint px-1.5 text-2xs font-semibold text-warn">{item.badge}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Navigasi utama">
      <NavLinks items={items} />
    </nav>
  );
}

/** Mobile: a top bar button that opens the same navigation in a sheet. */
export function MobileNav({
  items,
  label,
  closeLabel,
  footer,
}: {
  items: NavItem[];
  label: string;
  closeLabel: string;
  footer: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken lg:hidden"
        aria-label={label}
        aria-expanded={open}
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
              <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
              <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-4 bg-paper p-4 shadow-[var(--shadow-pop)]">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken"
                    aria-label={closeLabel}
                  >
                    <X className="size-5" strokeWidth={1.75} />
                  </button>
                </div>
                <nav aria-label={label} className="flex-1 overflow-y-auto">
                  <NavLinks items={items} onNavigate={() => setOpen(false)} />
                </nav>
                {footer}
              </div>
            </div>,
            // Rendered on <body>: the sticky header uses backdrop-filter, which would trap a fixed overlay inside it.
            document.body,
          )
        : null}
    </>
  );
}

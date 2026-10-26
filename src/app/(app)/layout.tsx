import Link from "next/link";
import { FlaskConical, Languages, LogOut } from "lucide-react";
import { can } from "@/domain/permissions";
import { getT } from "@/i18n/server";
import { SELECTABLE_LOCALES } from "@/i18n";
import { requireUser } from "@/server/auth/session";
import { pendingReviews } from "@/server/services/review";
import { setLocaleAction, signOutAction } from "../actions";
import { Logo } from "@/components/shell/logo";
import { MobileNav, SidebarNav, type NavItem } from "@/components/shell/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { t, locale } = await getT();

  const items: NavItem[] = [
    { key: "home" as const, href: "/", label: t.nav.home, show: true },
    { key: "ask" as const, href: "/ask", label: t.nav.ask, show: can(user, "ask") },
    { key: "capture" as const, href: "/capture", label: t.nav.capture, show: can(user, "capture") },
    { key: "library" as const, href: "/library", label: t.nav.library, show: can(user, "library") },
    { key: "decisions" as const, href: "/decisions", label: t.nav.decisions, show: can(user, "decisions") },
    { key: "gaps" as const, href: "/gaps", label: t.nav.gaps, show: can(user, "knowledge_gaps") },
    {
      key: "reviews" as const,
      href: "/reviews",
      label: t.nav.reviews,
      show: can(user, "review"),
      badge: can(user, "review") ? pendingReviews(user).length : undefined,
    },
    { key: "evaluation" as const, href: "/evaluation", label: t.nav.evaluation, show: can(user, "evaluation") },
    { key: "admin" as const, href: "/admin", label: t.nav.admin, show: can(user, "administration") },
  ].flatMap(({ show, ...item }) => (show ? [item] : []));

  const userCard = (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="px-1">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-2xs text-ink-3">{user.title}</p>
      </div>
      <div className="flex items-center gap-1">
        <form action={setLocaleAction} className="flex items-center gap-1">
          <Languages aria-hidden className="ml-1 size-3.5 text-ink-3" />
          {SELECTABLE_LOCALES.map((l) => (
            <button
              key={l}
              name="locale"
              value={l}
              aria-pressed={l === locale}
              className={`rounded-md px-1.5 py-0.5 text-2xs font-semibold uppercase ${
                l === locale ? "bg-ink text-paper" : "text-ink-3 hover:bg-sunken hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </form>
        <form action={signOutAction} className="ml-auto">
          <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-2 hover:bg-sunken hover:text-ink">
            <LogOut aria-hidden className="size-3.5" />
            {t.nav.signOut}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line px-3 py-5 lg:flex">
        <Link href="/" className="px-2">
          <Logo subtitle={t.app.company} />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={items} />
        </div>
        {userCard}
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-warn-tint/60 px-4 py-1.5 text-2xs text-warn lg:px-8">
          <FlaskConical aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{t.app.dummyBanner}</span>
        </div>
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/90 px-3 py-2 backdrop-blur lg:hidden">
          <MobileNav items={items} label={t.nav.more} closeLabel={t.common.cancel} footer={userCard} />
          <Link href="/">
            <Logo />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

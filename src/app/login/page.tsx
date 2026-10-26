import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getT } from "@/i18n/server";
import { getCurrentUser, mockAuthEnabled } from "@/server/auth/session";
import { getStore } from "@/server/store/memory-store";
import { signInAction } from "../actions";
import { Logo } from "@/components/shell/logo";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const { t } = await getT();
  const profiles = getStore().profiles.filter((p) => p.active);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <Logo subtitle={t.app.company} />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.login.title}</h1>
      <p className="mt-3 flex gap-2 rounded-lg bg-warn-tint px-3 py-2.5 text-sm text-warn">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {mockAuthEnabled() ? t.login.mockNotice : t.login.disabled}
      </p>

      {mockAuthEnabled() ? (
        <form action={signInAction} className="mt-6">
          <p className="eyebrow mb-2">{t.login.choose}</p>
          <ul className="card divide-y divide-line overflow-hidden">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  name="profileId"
                  value={p.id}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-sunken"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-xs text-ink-3">{p.title}</span>
                  </span>
                  <span className="shrink-0 text-2xs text-ink-3">{p.roles.map((r) => t.role[r]).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </form>
      ) : null}
    </main>
  );
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signInAs, signOut } from "@/server/auth/session";
import { LOCALE_COOKIE } from "@/i18n/server";
import { SELECTABLE_LOCALES } from "@/i18n";

export async function signInAction(formData: FormData) {
  const id = z.string().max(40).safeParse(formData.get("profileId"));
  if (id.success && (await signInAs(id.data))) redirect("/");
  redirect("/login?error=1");
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}

export async function setLocaleAction(formData: FormData) {
  const locale = z.enum(SELECTABLE_LOCALES as ["id", "en"]).safeParse(formData.get("locale"));
  if (locale.success) {
    (await cookies()).set(LOCALE_COOKIE, locale.data, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  revalidatePath("/", "layout");
}

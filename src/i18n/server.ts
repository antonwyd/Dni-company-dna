import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, getDictionary, isLocale, type Locale } from "./index";

export const LOCALE_COOKIE = "dni_locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

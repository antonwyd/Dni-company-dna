import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "@/domain/types";
import { getStore } from "@/server/store/memory-store";
import { recordAudit } from "@/server/services/audit";

/**
 * MOCK AUTHENTICATION — development only.
 *
 * A cookie holds the id of a synthetic persona. There is no password and no
 * signature, so this is NOT secure. It exists to exercise role-based access
 * in the prototype. Phase 2 replaces it with Supabase Auth (email/password,
 * optionally company SSO). Mock auth refuses to run in production builds
 * unless explicitly enabled for a demo.
 */
const COOKIE = "dni_mock_user";

export function mockAuthEnabled(): boolean {
  const mode = process.env.DNI_AUTH_MODE ?? "mock";
  if (mode !== "mock") return false;
  if (process.env.NODE_ENV === "production" && process.env.DNI_ALLOW_MOCK_AUTH_IN_PRODUCTION !== "true") {
    // `next start` is used for local e2e tests, so allow it on localhost only via the flag above.
    return process.env.DNI_E2E === "true";
  }
  return true;
}

export async function getCurrentUser(): Promise<Profile | null> {
  if (!mockAuthEnabled()) return null;
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const user = getStore().profiles.find((p) => p.id === id);
  return user && user.active ? user : null;
}

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function signInAs(profileId: string): Promise<boolean> {
  if (!mockAuthEnabled()) return false;
  const user = getStore().profiles.find((p) => p.id === profileId && p.active);
  if (!user) return false;
  const jar = await cookies();
  jar.set(COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  recordAudit({ actorId: user.id, action: "session.mock_sign_in", targetType: "session", targetId: null, outcome: "info" });
  return true;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

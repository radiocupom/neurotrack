import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { AuthUser, SessionPayload } from "@/lib/auth/types";

const SESSION_DURATION_IN_SECONDS = 60 * 60 * 8;
const SESSION_SECRET = process.env.SESSION_SECRET ?? "neuro-track-front-dev-secret-2026";
const SESSION_SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_IN_SECONDS}s`)
    .sign(SESSION_SECRET_KEY);
}

async function decrypt(session: string | undefined) {
  if (!session) {
    return null;
  }

  try {
    const verified = await jwtVerify<SessionPayload>(session, SESSION_SECRET_KEY, {
      algorithms: ["HS256"],
    });

    return verified.payload;
  } catch {
    return null;
  }
}

export async function createSession(input: { user: AuthUser; token: string }) {
  const expiresAt = Date.now() + SESSION_DURATION_IN_SECONDS * 1000;
  const session = await encrypt({ ...input, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return decrypt(cookie);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

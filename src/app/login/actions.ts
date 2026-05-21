"use server";

import { cookies } from "next/headers";

export async function loginAction(
  password: string
): Promise<{ ok: true } | { error: string }> {
  const expected = process.env.MOVE_CHECK_ACCESS_PASSWORD;

  // If no password is configured, always allow
  if (!expected || password === expected) {
    const cookieStore = await cookies();
    cookieStore.set("move-check-access", "ok", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return { ok: true };
  }

  return { error: "Senha incorreta" };
}

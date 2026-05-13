"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "updraft_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function loginAction(formData: FormData): Promise<void> {
  const password = formData.get("password");
  const from = (formData.get("from") as string | null) ?? "/";

  const expected = process.env.APP_PASSWORD;
  const token = process.env.AUTH_TOKEN;

  if (!expected || !token) {
    redirect("/login?error=server_misconfigured");
  }

  if (typeof password !== "string" || password !== expected) {
    redirect("/login?error=invalid");
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/";
  redirect(safeFrom);
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/login");
}

"use server";

import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  getSessionUser,
} from "@/server/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export async function registerAction(prevState: { error?: string } | null, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: "Invalid input. Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Email already registered." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: "BUYER",
    },
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);
  redirect("/");
}

export async function loginAction(prevState: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Invalid credentials." };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid credentials." };

  const token = await createSession(user.id);
  await setSessionCookie(token);
  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mazadi_session")?.value;
  if (token) await destroySession(token);
  await clearSessionCookie();
  redirect("/");
}

export async function getCurrentUser() {
  return getSessionUser();
}

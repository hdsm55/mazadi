"use server";

import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireUser, requireRole } from "@/server/auth/session";
import { toMinor } from "@/server/domain/money/money";
import { getPhoneProvider, generateVerificationCode } from "@/server/domain/trust/phone";
import { DepositStatus, KycStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

const phoneSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, "Invalid phone number"),
});

type TrustState = { error?: string; success?: boolean } | null;

/**
 * Request a verification code for the current user's phone (mock send).
 */
export async function requestPhoneVerificationAction(prevState: TrustState, formData: FormData): Promise<TrustState> {
  const user = await requireUser();
  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) return { error: "Invalid phone number." };

  const provider = getPhoneProvider();
  const code = generateVerificationCode();
  await provider.sendCode(parsed.data.phone, code);

  await prisma.user.update({ where: { id: user.id }, data: { phone: parsed.data.phone } });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "PHONE_VERIFY_REQUESTED", entity: "User", entityId: user.id },
  });
  return { success: true };
}

const verifySchema = z.object({
  code: z.string().min(4).max(8),
});

/**
 * Confirm the phone with the (mock) code. Marks phoneVerified=true.
 */
export async function verifyPhoneAction(prevState: TrustState, formData: FormData): Promise<TrustState> {
  const user = await requireUser();
  const parsed = verifySchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Invalid code." };

  const provider = getPhoneProvider();
  const ok = await provider.verifyCode(user.phone ?? "", parsed.data.code);
  if (!ok) return { error: "Incorrect verification code." };

  await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "PHONE_VERIFIED", entity: "User", entityId: user.id },
  });
  revalidatePath("/buyer");
  return { success: true };
}

const depositSchema = z.object({
  amount: z.coerce.number().positive(),
});

/**
 * Record a bidder deposit (mock — no real payment). Status is CONFIRMED so the
 * bidder becomes eligible to bid.
 */
export async function addDepositAction(prevState: TrustState, formData: FormData): Promise<TrustState> {
  const user = await requireUser();
  const parsed = depositSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) return { error: "Invalid deposit amount." };

  const amountMinor = toMinor(parsed.data.amount);
  await prisma.bidderDeposit.create({
    data: { userId: user.id, amountMinor, currency: "USD", status: DepositStatus.CONFIRMED },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "DEPOSIT_ADDED", entity: "BidderDeposit", metadata: { amountMinor } },
  });
  revalidatePath("/buyer");
  return { success: true };
}

const creditSchema = z.object({
  amount: z.coerce.number().nonnegative(),
});

/**
 * Admin sets a credit limit on a bidder (alternative to a deposit).
 */
export async function setCreditLimitAction(userId: string, prevState: TrustState, formData: FormData): Promise<TrustState> {
  await requireRole([Role.ADMIN]);
  const parsed = creditSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) return { error: "Invalid credit limit." };

  const amountMinor = toMinor(parsed.data.amount);
  await prisma.user.update({ where: { id: userId }, data: { creditLimitMinor: amountMinor } });
  await prisma.auditLog.create({
    data: { actorId: userId, action: "CREDIT_LIMIT_SET", entity: "User", entityId: userId, metadata: { amountMinor } },
  });
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Admin marks a bidder's KYC as verified (required for full seller approval).
 */
export async function setKycStatusAction(userId: string, status: KycStatus, prevState: TrustState, formData: FormData): Promise<TrustState> {
  await requireRole([Role.ADMIN]);
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: status, kycLevel: status === KycStatus.VERIFIED ? 1 : 0 },
  });
  await prisma.auditLog.create({
    data: { actorId: userId, action: "KYC_STATUS_SET", entity: "User", entityId: userId, metadata: { status } },
  });
  revalidatePath("/admin");
  return { success: true };
}

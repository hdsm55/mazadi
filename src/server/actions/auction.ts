"use server";

import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireRole, requireUser } from "@/server/auth/session";
import { placeBid, setMaxBid, BidError } from "@/server/domain/auction/bid-engine";
import { toMinor } from "@/server/domain/money/money";
import { AuctionStatus, LotStatus, ApprovalStatus, Role, Condition } from "@prisma/client";
import { revalidatePath } from "next/cache";

const createAuctionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  currency: z.string().default("USD"),
  antiSnipingEnabled: z.boolean().default(true),
});

export async function createAuctionAction(prevState: { error?: string; success?: boolean; auctionId?: string } | null, formData: FormData) {
  const user = await requireRole([Role.SELLER, Role.ADMIN]);
  const parsed = createAuctionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    currency: formData.get("currency"),
    antiSnipingEnabled: formData.get("antiSnipingEnabled") === "on",
  });
  if (!parsed.success) return { error: "Invalid auction data." };

  const auction = await prisma.auction.create({
    data: {
      sellerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      currency: parsed.data.currency,
      antiSnipingEnabled: parsed.data.antiSnipingEnabled,
      status: AuctionStatus.DRAFT,
      approvalStatus: ApprovalStatus.PENDING,
    },
  });
  await prisma.auctionEvent.create({
    data: { auctionId: auction.id, type: "AuctionCreated", payload: { title: auction.title } },
  });
  revalidatePath("/seller");
  return { success: true, auctionId: auction.id };
}

const createLotSchema = z.object({
  auctionId: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  condition: z.string().default("GOOD"),
  startingPrice: z.coerce.number().positive(),
  reservePrice: z.coerce.number().optional(),
  buyNowPrice: z.coerce.number().optional(),
});

export async function createLotAction(prevState: { error?: string; success?: boolean; lotId?: string } | null, formData: FormData) {
  const user = await requireRole([Role.SELLER, Role.ADMIN]);
  const parsed = createLotSchema.safeParse({
    auctionId: formData.get("auctionId"),
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    condition: formData.get("condition"),
    startingPrice: formData.get("startingPrice"),
    reservePrice: formData.get("reservePrice"),
    buyNowPrice: formData.get("buyNowPrice"),
  });
  if (!parsed.success) return { error: "Invalid lot data." };

  const auction = await prisma.auction.findUnique({ where: { id: parsed.data.auctionId } });
  if (!auction || auction.sellerId !== user.id) return { error: "Auction not found." };

  const lot = await prisma.lot.create({
    data: {
      auctionId: auction.id,
      sellerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      condition: parsed.data.condition as Condition,
      startingPriceMinor: toMinor(parsed.data.startingPrice),
      reservePriceMinor: parsed.data.reservePrice ? toMinor(parsed.data.reservePrice) : null,
      buyNowPriceMinor: parsed.data.buyNowPrice ? toMinor(parsed.data.buyNowPrice) : null,
      currency: auction.currency,
      startAt: auction.startAt,
      endAt: auction.endAt,
      status: LotStatus.DRAFT,
    },
  });
  await prisma.auctionEvent.create({
    data: { auctionId: auction.id, lotId: lot.id, type: "LotAdded", payload: { title: lot.title } },
  });
  revalidatePath("/seller");
  return { success: true, lotId: lot.id };
}

export async function publishAuctionAction(auctionId: string, prevState: { error?: string; success?: boolean } | null, formData: FormData) {
  const user = await requireRole([Role.SELLER, Role.ADMIN]);
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction || auction.sellerId !== user.id) return { error: "Auction not found." };

  const lots = await prisma.lot.count({ where: { auctionId } });
  if (lots === 0) return { error: "Auction must have at least one lot." };

  const now = new Date();
  const status = auction.startAt <= now ? AuctionStatus.LIVE : AuctionStatus.SCHEDULED;
  await prisma.auction.update({
    where: { id: auctionId },
    data: { status, approvalStatus: ApprovalStatus.APPROVED },
  });
  await prisma.lot.updateMany({
    where: { auctionId },
    data: { status: status === AuctionStatus.LIVE ? LotStatus.LIVE : LotStatus.SCHEDULED },
  });
  await prisma.auctionEvent.create({
    data: { auctionId, type: "AuctionPublished", payload: { status } },
  });
  revalidatePath("/seller");
  return { success: true };
}

export async function placeBidAction(formData: FormData) {
  const user = await requireUser();
  const lotId = String(formData.get("lotId") ?? "");
  const amount = Number(formData.get("amount"));
  const idempotencyKey = String(formData.get("idempotencyKey") ?? crypto.randomUUID());

  try {
    const result = await placeBid({
      lotId,
      bidderId: user.id,
      amountMinor: toMinor(amount),
      currency: "USD",
      idempotencyKey,
    });
    revalidatePath(`/lots/${lotId}`);
    return { success: true, result };
  } catch (e) {
    if (e instanceof BidError) return { error: e.message };
    return { error: "Failed to place bid." };
  }
}

export async function setMaxBidAction(formData: FormData) {
  const user = await requireUser();
  const lotId = String(formData.get("lotId") ?? "");
  const maxAmount = Number(formData.get("maxAmount"));

  try {
    const result = await setMaxBid({
      lotId,
      bidderId: user.id,
      maxAmountMinor: toMinor(maxAmount),
      currency: "USD",
    });
    revalidatePath(`/lots/${lotId}`);
    return { success: true, result };
  } catch (e) {
    if (e instanceof BidError) return { error: e.message };
    return { error: "Failed to set max bid." };
  }
}

import { prisma } from "@/server/db/prisma";
import { NotificationType } from "@prisma/client";

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
    },
  });
}

export async function notifyOutbid(bidderId: string, lotTitle: string, newAmountMinor: number) {
  return notifyUser({
    userId: bidderId,
    type: "OUTBID",
    title: "You've been outbid",
    body: `Your bid on "${lotTitle}" was outbid. Current bid: $${(newAmountMinor / 100).toFixed(2)}`,
  });
}

export async function notifyWinner(buyerId: string, lotTitle: string, amountMinor: number) {
  return notifyUser({
    userId: buyerId,
    type: "AUCTION_WON",
    title: "You won the auction!",
    body: `Congratulations! You won "${lotTitle}" for $${(amountMinor / 100).toFixed(2)}. Payment is required.`,
  });
}

export async function notifyPaymentRequired(buyerId: string, lotTitle: string, amountMinor: number) {
  return notifyUser({
    userId: buyerId,
    type: "PAYMENT_REQUIRED",
    title: "Payment required",
    body: `Please complete payment for "${lotTitle}" ($${(amountMinor / 100).toFixed(2)}).`,
  });
}

export async function notifySold(sellerId: string, lotTitle: string, amountMinor: number) {
  return notifyUser({
    userId: sellerId,
    type: "SOLD",
    title: "Your item sold!",
    body: `"${lotTitle}" sold for $${(amountMinor / 100).toFixed(2)}.`,
  });
}

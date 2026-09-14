import { prisma } from "@/server/db/prisma";
import { PaymentStatus, SettlementStatus } from "@prisma/client";

// Mock payment provider — simulates a real payment gateway.
// In production this would be Stripe Connect / Adyen.

export async function createMockPayment(settlementId: string): Promise<{ ok: boolean; error?: string }> {
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { lot: true },
  });
  if (!settlement) return { ok: false, error: "Settlement not found" };

  // Simulate payment processing.
  const payment = await prisma.payment.create({
    data: {
      settlementId,
      amountMinor: settlement.amountMinor,
      currency: settlement.currency,
      status: PaymentStatus.PAID,
      provider: "mock",
      providerRef: `mock_${crypto.randomUUID()}`,
    },
  });

  await prisma.settlement.update({
    where: { id: settlementId },
    data: { status: SettlementStatus.PAID },
  });

  await prisma.auctionEvent.create({
    data: {
      auctionId: settlement.auctionId,
      lotId: settlement.lotId,
      type: "PaymentCompleted",
      payload: { paymentId: payment.id, amountMinor: payment.amountMinor },
    },
  });

  return { ok: true };
}

export async function getSettlementForLot(lotId: string) {
  return prisma.settlement.findUnique({ where: { lotId } });
}

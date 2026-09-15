// Bidder deposit / credit-limit eligibility for bidding.
//
// A bidder may place a bid if EITHER:
//   - they hold a CONFIRMED deposit >= the bid amount, OR
//   - their credit limit (creditLimitMinor) >= the bid amount.
//
// The enforcement is gated by TRUST_ENFORCE_BIDS. When disabled (default for
// seed/test), eligibility is permissive but the decision is logged so the
// behaviour is observable. Set TRUST_ENFORCE_BIDS=1 to enforce.

import { prisma } from "@/server/db/prisma";
import { DepositStatus } from "@prisma/client";

export interface EligibilityResult {
  allowed: boolean;
  reason: string;
  enforced: boolean;
}

export function isBidEnforcementEnabled(): boolean {
  return process.env.TRUST_ENFORCE_BIDS === "1";
}

/**
 * Check whether a bidder is eligible to place a bid of `amountMinor`.
 * Returns allowed=true when enforcement is disabled (permissive default).
 */
export async function checkBidderEligibility(
  userId: string,
  amountMinor: number,
): Promise<EligibilityResult> {
  const enforced = isBidEnforcementEnabled();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      deposits: {
        where: { status: DepositStatus.CONFIRMED },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!user) {
    return { allowed: false, reason: "Bidder not found", enforced };
  }

  const depositMinor = user.deposits[0]?.amountMinor ?? 0;
  const creditMinor = user.creditLimitMinor;

  const hasDeposit = depositMinor >= amountMinor;
  const hasCredit = creditMinor >= amountMinor;

  if (hasDeposit || hasCredit) {
    return { allowed: true, reason: "eligible", enforced };
  }

  const reason = `insufficient funds: deposit=${depositMinor} credit=${creditMinor} required=${amountMinor}`;
  if (!enforced) {
    // Permissive default — log the decision but allow the bid (seed/test).
    console.log(`[trust] bid allowed (enforcement off): ${reason}`);
    return { allowed: true, reason, enforced };
  }
  return { allowed: false, reason, enforced };
}

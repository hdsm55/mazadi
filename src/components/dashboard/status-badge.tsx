import { Badge } from "@/components/ui/badge";

// Maps domain status enums to a consistent visual language across dashboards.

const LOT_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  LIVE: "success",
  SCHEDULED: "warning",
  DRAFT: "secondary",
  SOLD: "gold",
  UNSOLD: "outline",
  PASSED: "outline",
  CANCELLED: "destructive",
};

const AUCTION_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  LIVE: "success",
  SCHEDULED: "warning",
  EXTENDED: "warning",
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  ENDED: "outline",
  SETTLING: "gold",
  SETTLED: "gold",
  CANCELLED: "destructive",
};

const BID_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  WINNING: "success",
  ACTIVE: "secondary",
  OUTBID: "destructive",
  WON: "gold",
  CANCELLED: "outline",
};

const SETTLEMENT_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  SETTLED: "gold",
  CANCELLED: "destructive",
};

const PAYMENT_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  PAID: "success",
  AUTHORIZED: "warning",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
  PARTIALLY_REFUNDED: "outline",
  DISPUTED: "destructive",
  CANCELLED: "outline",
};

const RISK_LEVEL_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

const KYC_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  VERIFIED: "success",
  PENDING: "warning",
  UNVERIFIED: "secondary",
  REJECTED: "destructive",
};

const SELLER_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  APPROVED: "success",
  PENDING_REVIEW: "warning",
  SELLER_APPLICATION: "warning",
  REGISTERED: "secondary",
  REJECTED: "destructive",
};

const DEPOSIT_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "outline" | "gold"> = {
  CONFIRMED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
  REFUNDED: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  const variant =
    LOT_STATUS_VARIANT[status] ??
    AUCTION_STATUS_VARIANT[status] ??
    BID_STATUS_VARIANT[status] ??
    SETTLEMENT_STATUS_VARIANT[status] ??
    PAYMENT_STATUS_VARIANT[status] ??
    RISK_LEVEL_VARIANT[status] ??
    KYC_STATUS_VARIANT[status] ??
    SELLER_STATUS_VARIANT[status] ??
    DEPOSIT_STATUS_VARIANT[status] ??
    "secondary";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

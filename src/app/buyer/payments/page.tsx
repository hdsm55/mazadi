import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getBuyerSettlements } from "@/server/readers/buyer";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { createMockPayment } from "@/server/domain/payment/payment";
import { revalidatePath } from "next/cache";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerPaymentsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const settlements = await getBuyerSettlements(user.id);

  async function pay(formData: FormData) {
    "use server";
    const settlementId = String(formData.get("settlementId") ?? "");
    await createMockPayment(settlementId);
    revalidatePath("/buyer/payments");
  }

  const pending = settlements.filter((s) => s.status === "PENDING_PAYMENT");
  const paid = settlements.filter((s) => s.status !== "PENDING_PAYMENT");

  return (
    <DashboardShell title="Payments" subtitle="Review and complete payments for your won lots." nav={buyerNav} active="/buyer/payments">
      {settlements.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" aria-hidden />}
          title="No payments required"
          description="When you win an auction, payment details will appear here."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Pending payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pending.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
                    <div>
                      <p className="font-semibold text-foreground">{s.lot.title}</p>
                      <p className="text-3xl font-bold tabular-nums text-foreground">{formatMoney(s.amountMinor, s.currency)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={s.status} />
                      <form action={pay}>
                        <input type="hidden" name="settlementId" value={s.id} />
                        <Button type="submit" variant="gold">
                          Pay Now
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {paid.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Payment history</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {paid.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                      <span className="font-medium text-foreground">{s.lot.title}</span>
                      <span className="text-xl font-bold tabular-nums text-foreground">{formatMoney(s.amountMinor, s.currency)}</span>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </DashboardShell>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { formatMoney } from "@/lib/utils";
import { createMockPayment } from "@/server/domain/payment/payment";
import { revalidatePath } from "next/cache";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const settlements = await prisma.settlement.findMany({
    where: { buyerId: user.id },
    include: { lot: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  async function pay(formData: FormData) {
    "use server";
    const settlementId = String(formData.get("settlementId") ?? "");
    await createMockPayment(settlementId);
    revalidatePath("/payments");
  }

  const pending = settlements.filter((s) => s.status === "PENDING_PAYMENT");
  const paid = settlements.filter((s) => s.status !== "PENDING_PAYMENT");

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Payments"
        title="Your payments"
        description="Review and complete payments for your won lots."
      />

      {settlements.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" aria-hidden />}
          title="No payments required"
          description="When you win an auction, payment details will appear here."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h2 className="mb-4 font-serif text-2xl font-semibold text-foreground">Pending Payment</h2>
              <div className="grid gap-4">
                {pending.map((s) => (
                  <Card key={s.id} className="card-lift">
                    <CardHeader>
                      <CardTitle className="text-xl">{s.lot.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-3xl font-bold tabular-nums text-foreground">
                          {formatMoney(s.amountMinor, s.currency)}
                        </p>
                        <Badge variant="warning" className="mt-2">
                          {s.status}
                        </Badge>
                      </div>
                      <form action={pay}>
                        <input type="hidden" name="settlementId" value={s.id} />
                        <Button type="submit" variant="gold">
                          Pay Now
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {paid.length > 0 && (
            <section>
              <h2 className="mb-4 font-serif text-2xl font-semibold text-foreground">Payment History</h2>
              <div className="grid gap-4">
                {paid.map((s) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <CardTitle className="text-xl">{s.lot.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <p className="text-2xl font-bold tabular-nums text-foreground">
                        {formatMoney(s.amountMinor, s.currency)}
                      </p>
                      <Badge variant="success">{s.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { createMockPayment } from "@/server/domain/payment/payment";
import { revalidatePath } from "next/cache";

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments</h1>

      {settlements.length === 0 ? (
        <p className="text-muted-foreground">No payments required.</p>
      ) : (
        <div className="grid gap-4">
          {settlements.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-lg">{s.lot.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatMoney(s.amountMinor, s.currency)}</p>
                  <p className="text-sm text-muted-foreground">Status: {s.status}</p>
                </div>
                {s.status === "PENDING_PAYMENT" && (
                  <form action={pay}>
                    <input type="hidden" name="settlementId" value={s.id} />
                    <Button type="submit">Pay Now (Mock)</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

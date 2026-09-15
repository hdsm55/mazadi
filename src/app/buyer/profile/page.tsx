import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { DashboardShell, buyerNav } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneVerificationForm, DepositForm } from "@/components/trust-forms";
import { getBuyerDeposits } from "@/server/readers/buyer";
import { formatMoney } from "@/lib/utils";
import { ShieldCheck, Wallet, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerProfilePage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const deposits = await getBuyerDeposits(user.id);
  const totalDepositMinor = deposits
    .filter((d) => d.status === "CONFIRMED")
    .reduce((sum, d) => sum + d.amountMinor, 0);

  return (
    <DashboardShell title="Profile & Security" subtitle="Your account details and trust settings." nav={buyerNav} active="/buyer/profile">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-accent" aria-hidden />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-foreground">{user.name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">{user.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">KYC status</span>
              <Badge variant={user.kycStatus === "VERIFIED" ? "success" : "warning"}>{user.kycStatus}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
              Trust &amp; Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Phone verification</p>
              <PhoneVerificationForm phoneVerified={user.phoneVerified} />
              <p className="text-xs text-muted-foreground">Verified bidders are trusted with higher limits.</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Bidder deposit</p>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent" aria-hidden />
                <span className="text-sm text-muted-foreground">
                  Confirmed deposit:{" "}
                  <span className="font-semibold text-foreground">{formatMoney(totalDepositMinor)}</span>
                </span>
              </div>
              <DepositForm />
              <p className="text-xs text-muted-foreground">A confirmed deposit or credit limit is required to bid.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

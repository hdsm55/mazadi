"use client";

import { useActionState } from "react";
import {
  requestPhoneVerificationAction,
  verifyPhoneAction,
  addDepositAction,
  setCreditLimitAction,
  setKycStatusAction,
} from "@/server/actions/trust";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KycStatus } from "@prisma/client";

export function PhoneVerificationForm({ phoneVerified }: { phoneVerified: boolean }) {
  const [reqState, reqAction, reqPending] = useActionState(requestPhoneVerificationAction, null);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPhoneAction, null);

  if (phoneVerified) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">Phone verified</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form action={reqAction} className="flex gap-2">
        <Input type="tel" name="phone" placeholder="+1 555 000 0000" required />
        <Button type="submit" size="sm" disabled={reqPending}>
          {reqPending ? "Sending..." : "Send code"}
        </Button>
      </form>
      {reqState?.success && (
        <p className="text-xs text-muted-foreground">
          Mock code sent (check server logs). Use <code className="font-mono">123456</code>.
        </p>
      )}
      {reqState?.error && <p className="text-sm text-destructive">{reqState.error}</p>}
      <form action={verifyAction} className="flex gap-2">
        <Input type="text" name="code" placeholder="Verification code" required />
        <Button type="submit" size="sm" variant="outline" disabled={verifyPending}>
          {verifyPending ? "Verifying..." : "Verify"}
        </Button>
      </form>
      {verifyState?.error && <p className="text-sm text-destructive">{verifyState.error}</p>}
    </div>
  );
}

export function DepositForm() {
  const [state, action, pending] = useActionState(addDepositAction, null);
  return (
    <form action={action} className="flex gap-2">
      <Input type="number" name="amount" placeholder="Deposit amount ($)" min="0" step="0.01" required />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding..." : "Add deposit"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function CreditLimitForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(setCreditLimitAction.bind(null, userId), null);
  return (
    <form action={action} className="flex gap-2">
      <Input type="number" name="amount" placeholder="Credit limit ($)" min="0" step="0.01" required />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Setting..." : "Set limit"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function KycStatusButton({ userId, status }: { userId: string; status: KycStatus }) {
  const [state, action, pending] = useActionState(setKycStatusAction.bind(null, userId, status), null);
  return (
    <form action={action}>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Updating..." : `Mark ${status}`}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

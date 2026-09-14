"use client";

import { useActionState } from "react";
import { approveSellerAction } from "@/server/actions/auction";
import { Button } from "@/components/ui/button";

export function ApproveSellerButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(approveSellerAction.bind(null, userId), null);
  return (
    <form action={formAction}>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Approving..." : "Approve"}
      </Button>
    </form>
  );
}

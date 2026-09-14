"use client";

import { useActionState } from "react";
import { createAuctionAction, createLotAction, publishAuctionAction } from "@/server/actions/auction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateAuctionForm() {
  const [state, formAction, pending] = useActionState(createAuctionAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Input type="text" name="title" placeholder="Auction title" required />
      <Textarea name="description" placeholder="Description" />
      <div className="grid grid-cols-2 gap-4">
        <Input type="datetime-local" name="startAt" required />
        <Input type="datetime-local" name="endAt" required />
      </div>
      <Input type="text" name="currency" defaultValue="USD" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="antiSnipingEnabled" defaultChecked />
        Anti-sniping enabled
      </label>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating..." : "Create Auction"}
      </Button>
    </form>
  );
}

export function CreateLotForm({ auctions, categories }: { auctions: Array<{ id: string; title: string }>; categories: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createLotAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <select name="auctionId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
        <option value="">Select auction</option>
        {auctions.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}
          </option>
        ))}
      </select>
      <Input type="text" name="title" placeholder="Lot title" required />
      <Textarea name="description" placeholder="Description" />
      <select name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-4">
        <Input type="number" name="startingPrice" placeholder="Start $" required />
        <Input type="number" name="reservePrice" placeholder="Reserve $" />
        <Input type="number" name="buyNowPrice" placeholder="Buy now $" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating..." : "Create Lot"}
      </Button>
    </form>
  );
}

export function PublishAuctionButton({ auctionId }: { auctionId: string }) {
  const [state, formAction, pending] = useActionState(publishAuctionAction.bind(null, auctionId), null);
  return (
    <form action={formAction}>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Publishing..." : "Publish"}
      </Button>
    </form>
  );
}

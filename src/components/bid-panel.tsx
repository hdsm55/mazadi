"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatTimeRemaining } from "@/lib/utils";
import { placeBidAction, setMaxBidAction } from "@/server/actions/auction";

interface LotState {
  currentBidMinor: number;
  currentBidderId: string | null;
  bidCount: number;
  reserveMet: boolean;
  endAt: string;
  status: string;
}

export function BidPanel({
  lotId,
  initial,
  userId,
  isSeller,
}: {
  lotId: string;
  initial: LotState;
  userId: string | null;
  isSeller: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<LotState>(initial);
  const [amount, setAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Realtime via WebSocket.
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "subscribe", lotId }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.topic === "bid.updated" && msg.payload?.lotId === lotId) {
          setState((prev) => ({
            ...prev,
            currentBidMinor: msg.payload.amountMinor,
            currentBidderId: msg.payload.bidderId,
            bidCount: msg.payload.bidCount,
            reserveMet: msg.payload.reserveMet,
            endAt: msg.payload.endAt,
          }));
        }
        if (msg.topic === "lot.closed" && msg.payload?.lotId === lotId) {
          setState((prev) => ({ ...prev, status: msg.payload.status }));
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, [lotId]);

  const handleBid = useCallback(async () => {
    setError(null);
    const formData = new FormData();
    formData.set("lotId", lotId);
    formData.set("amount", amount);
    formData.set("idempotencyKey", crypto.randomUUID());
    const res = await placeBidAction(formData);
    if (res.error) setError(res.error);
    else {
      setAmount("");
      router.refresh();
    }
  }, [amount, lotId, router]);

  const handleMaxBid = useCallback(async () => {
    setError(null);
    const formData = new FormData();
    formData.set("lotId", lotId);
    formData.set("maxAmount", maxAmount);
    const res = await setMaxBidAction(formData);
    if (res.error) setError(res.error);
    else {
      setMaxAmount("");
      router.refresh();
    }
  }, [maxAmount, lotId, router]);

  const isLive = state.status === "LIVE";
  const isEnded = state.status === "SOLD" || state.status === "UNSOLD" || state.status === "ENDED";

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <Badge variant={isLive ? "success" : "secondary"}>
          {isLive ? "Live" : isEnded ? "Ended" : state.status}
        </Badge>
        <span className="text-xs text-muted-foreground">{connected ? "● Live" : "○ Offline"}</span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Current Bid</p>
        <p className="text-4xl font-bold tabular-nums">{formatMoney(state.currentBidMinor)}</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>{state.bidCount} bids</span>
        <span className="tabular-nums font-medium">{formatTimeRemaining(state.endAt)}</span>
      </div>

      <div>
        <Badge variant={state.reserveMet ? "success" : "outline"}>
          {state.reserveMet ? "Reserve met" : "Reserve not met"}
        </Badge>
      </div>

      {!userId ? (
        <p className="text-sm text-muted-foreground">Please log in to place a bid.</p>
      ) : isSeller ? (
        <p className="text-sm text-muted-foreground">You cannot bid on your own lot.</p>
      ) : isLive ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Your bid ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button onClick={handleBid}>Place Bid</Button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Max bid ($)"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
            <Button variant="outline" onClick={handleMaxBid}>
              Set Max
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This auction has ended.</p>
      )}
    </div>
  );
}

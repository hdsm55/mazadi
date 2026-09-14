"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { formatMoney } from "@/lib/utils";
import { placeBidAction, setMaxBidAction } from "@/server/actions/auction";
import { Gavel, TrendingUp, CheckCircle2, AlertTriangle, Wifi, WifiOff } from "lucide-react";

interface LotState {
  currentBidMinor: number;
  currentBidderId: string | null;
  bidCount: number;
  reserveMet: boolean;
  endAt: string;
  status: string;
}

type Feedback = "idle" | "outbid" | "reserve-met" | "extended" | "won";

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
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [flash, setFlash] = useState(false);

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
          setState((prev) => {
            const next = {
              ...prev,
              currentBidMinor: msg.payload.amountMinor,
              currentBidderId: msg.payload.bidderId,
              bidCount: msg.payload.bidCount,
              reserveMet: msg.payload.reserveMet,
              endAt: msg.payload.endAt,
            };
            // Feedback states
            if (msg.payload.reserveMet && !prev.reserveMet) {
              setFeedback("reserve-met");
            } else if (msg.payload.endAt !== prev.endAt) {
              setFeedback("extended");
            } else if (msg.payload.bidderId && msg.payload.bidderId !== userId) {
              setFeedback("outbid");
            }
            setFlash(true);
            setTimeout(() => setFlash(false), 1200);
            return next;
          });
        }
        if (msg.topic === "lot.closed" && msg.payload?.lotId === lotId) {
          setState((prev) => ({ ...prev, status: msg.payload.status }));
          if (msg.payload.status === "SOLD" && msg.payload.winnerId === userId) {
            setFeedback("won");
          }
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, [lotId, userId]);

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

  const feedbackBanner = (() => {
    switch (feedback) {
      case "outbid":
        return (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            <TrendingUp className="h-4 w-4" aria-hidden />
            You've been outbid
          </div>
        );
      case "reserve-met":
        return (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Reserve met
          </div>
        );
      case "extended":
        return (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Time extended
          </div>
        );
      case "won":
        return (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <Gavel className="h-4 w-4" aria-hidden />
            You won this lot!
          </div>
        );
      default:
        return null;
    }
  })();

  const panel = (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant={isLive ? "success" : "secondary"} className="gap-1.5">
          {isLive && <span className="live-dot" aria-hidden />}
          {isLive ? "Live" : isEnded ? "Ended" : state.status}
        </Badge>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${connected ? "text-success" : "text-muted-foreground"}`}
        >
          {connected ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      {/* Current bid */}
      <div className={`rounded-xl border p-4 transition-colors duration-300 ${flash ? "border-accent bg-accent/5" : "border-border bg-muted/30"}`}>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Current bid</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
          {formatMoney(state.currentBidMinor)}
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{state.bidCount} bids</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            Time left
            <Countdown endAt={state.endAt} urgent={isLive} className="text-sm" />
          </span>
        </div>
      </div>

      {/* Reserve status */}
      <div className="flex items-center justify-between">
        <Badge variant={state.reserveMet ? "success" : "warning"}>
          {state.reserveMet ? "Reserve met" : "Reserve not met"}
        </Badge>
        <span className="text-xs text-muted-foreground">Seller's minimum price</span>
      </div>

      {feedbackBanner}

      {/* Bid actions */}
      {!userId ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Please log in to place a bid.
        </p>
      ) : isSeller ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          You cannot bid on your own lot.
        </p>
      ) : isLive ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Your bid ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Your bid amount"
            />
            <Button variant="gold" onClick={handleBid} className="shrink-0">
              <Gavel className="h-4 w-4" aria-hidden />
              Bid
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Max bid ($)"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              aria-label="Maximum bid amount"
            />
            <Button variant="outline" onClick={handleMaxBid} className="shrink-0">
              Set Max
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Set a max bid and our proxy engine will auto-bid on your behalf up to that amount.
          </p>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          This auction has ended.
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop panel */}
      <div className="hidden lg:block">{panel}</div>

      {/* Mobile sticky CTA */}
      {isLive && userId && !isSeller && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current bid</p>
              <p className="truncate text-lg font-bold tabular-nums text-foreground">
                {formatMoney(state.currentBidMinor)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Time left</p>
              <Countdown endAt={state.endAt} urgent className="text-lg" />
            </div>
            <Button variant="gold" onClick={handleBid} className="shrink-0">
              <Gavel className="h-4 w-4" aria-hidden />
              Bid
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

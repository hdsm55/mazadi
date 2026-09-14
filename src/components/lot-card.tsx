import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { formatMoney } from "@/lib/utils";
import { LotStatus } from "@prisma/client";

export interface LotCardData {
  id: string;
  title: string;
  description?: string | null;
  currentBidMinor: number;
  currency: string;
  bidCount: number;
  endAt: Date | string;
  status: LotStatus;
  reserveMet: boolean;
  category?: { name: string } | null;
  condition?: string | null;
}

function statusBadge(status: LotStatus) {
  switch (status) {
    case LotStatus.LIVE:
      return (
        <Badge variant="success" className="gap-1.5">
          <span className="live-dot" aria-hidden />
          Live
        </Badge>
      );
    case LotStatus.SCHEDULED:
      return <Badge variant="secondary">Scheduled</Badge>;
    case LotStatus.SOLD:
      return <Badge variant="accent">Sold</Badge>;
    case LotStatus.UNSOLD:
    case LotStatus.PASSED:
      return <Badge variant="outline">Unsold</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function LotCard({ lot, className }: { lot: LotCardData; className?: string }) {
  const isLive = lot.status === LotStatus.LIVE;
  const isEnded = lot.status === LotStatus.SOLD || lot.status === LotStatus.UNSOLD || lot.status === LotStatus.PASSED;

  return (
    <Link href={`/lots/${lot.id}`} className={`group block h-full ${className ?? ""}`}>
      <article className="card-lift flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {/* Visual */}
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent/70">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.5),transparent_50%),radial-gradient(circle_at_80%_80%,hsl(var(--accent)/0.4),transparent_50%)]" />
          <span className="font-serif text-5xl font-semibold text-white/90 transition-transform duration-300 group-hover:scale-110">
            {lot.title.charAt(0)}
          </span>
          <div className="absolute left-3 top-3">{statusBadge(lot.status)}</div>
          {lot.category?.name && (
            <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur">
              {lot.category.name}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="font-serif text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
            {lot.title}
          </h3>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {isEnded ? "Final price" : "Current bid"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatMoney(lot.currentBidMinor, lot.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {isEnded ? "Result" : "Time left"}
              </p>
              <Countdown
                endAt={lot.endAt instanceof Date ? lot.endAt.toISOString() : lot.endAt}
                urgent={isLive}
                className="text-sm"
              />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-foreground">{lot.bidCount}</span> bids
            </span>
            {isLive && !lot.reserveMet && <span className="text-warning">Reserve not met</span>}
            {isLive && lot.reserveMet && <span className="text-success">Reserve met</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}

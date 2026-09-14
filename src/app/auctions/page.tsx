import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { LotCard } from "@/components/lot-card";
import { LotStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const lots = await prisma.lot.findMany({
    where: { status: { in: [LotStatus.LIVE, LotStatus.SCHEDULED] } },
    include: { auction: true, category: true },
    orderBy: { endAt: "asc" },
  });

  const live = lots.filter((l) => l.status === LotStatus.LIVE);
  const scheduled = lots.filter((l) => l.status === LotStatus.SCHEDULED);

  return (
    <div className="space-y-12">
      <SectionHeader
        eyebrow="Marketplace"
        title="All Auctions"
        description="Browse every live and upcoming lot on Mazadi."
      />

      {live.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
            <span className="live-dot" aria-hidden />
            Live Now
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-2xl font-semibold text-foreground">Upcoming</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        </section>
      )}

      {lots.length === 0 && (
        <p className="text-muted-foreground">No auctions available right now. Check back soon.</p>
      )}
    </div>
  );
}

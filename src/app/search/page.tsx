import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatTimeRemaining } from "@/lib/utils";
import { LotStatus } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const category = params.category ?? "";
  const status = params.status ?? "";

  const categories = await prisma.category.findMany();

  const lots = await prisma.lot.findMany({
    where: {
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { categoryId: category } : {}),
      ...(status ? { status: status as LotStatus } : {}),
    },
    include: { category: true },
    orderBy: { endAt: "asc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search</h1>

      <form className="flex gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search lots..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <select name="category" className="flex h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} selected={c.id === category}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" className="flex h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {Object.values(LotStatus).map((s) => (
            <option key={s} value={s} selected={s === status}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <Link key={lot.id} href={`/lots/${lot.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={lot.status === LotStatus.LIVE ? "success" : "secondary"}>{lot.status}</Badge>
                  <span className="text-xs text-muted-foreground">{lot.category?.name ?? "General"}</span>
                </div>
                <CardTitle className="text-lg">{lot.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">{formatMoney(lot.currentBidMinor, lot.currency)}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{lot.bidCount} bids</span>
                  <span className="tabular-nums">{formatTimeRemaining(lot.endAt)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

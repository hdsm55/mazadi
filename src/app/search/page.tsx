import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { LotCard } from "@/components/lot-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LotStatus } from "@prisma/client";
import { Search } from "lucide-react";

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
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Search"
        title="Find your next lot"
        description="Search across all live and upcoming auctions."
      />

      <form className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="text" name="q" defaultValue={q} placeholder="Search lots..." className="pl-9" />
        </div>
        <select name="category" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-48">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} selected={c.id === category}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-40">
          <option value="">All statuses</option>
          {Object.values(LotStatus).map((s) => (
            <option key={s} value={s} selected={s === status}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" variant="gold" className="shrink-0">
          Search
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {lots.length} result{lots.length === 1 ? "" : "s"}
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <LotCard key={lot.id} lot={lot} />
        ))}
      </div>

      {lots.length === 0 && (
        <p className="text-muted-foreground">No lots match your search. Try different filters.</p>
      )}
    </div>
  );
}

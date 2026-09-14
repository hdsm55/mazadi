import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { LotCard } from "@/components/lot-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LotStatus, Condition } from "@prisma/client";
import { Search } from "lucide-react";
import { searchLots } from "@/server/search";

export const dynamic = "force-dynamic";

const SORTS = [
  { value: "ending-soon", label: "Ending soon" },
  { value: "newest", label: "Newest" },
  { value: "most-bids", label: "Most bids" },
  { value: "highest-price", label: "Highest price" },
  { value: "lowest-price", label: "Lowest price" },
  { value: "trending", label: "Trending" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

function parsePrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    minPrice?: string;
    maxPrice?: string;
    reserveMet?: string;
    condition?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const category = params.category ?? "";
  const status = params.status ?? "";
  const condition = params.condition ?? "";
  const sort = (params.sort ?? "ending-soon") as SortValue;
  const minPriceMinor = parsePrice(params.minPrice);
  const maxPriceMinor = parsePrice(params.maxPrice);
  const reserveMet = params.reserveMet === "true" ? true : params.reserveMet === "false" ? false : undefined;

  const categories = await prisma.category.findMany();

  // Try Meilisearch first; fall back to a direct Prisma query if the index is
  // unreachable or empty so the page never renders dead.
  let lotIds: string[] = [];
  let usedMeili = false;
  try {
    lotIds = await searchLots({
      q: q || undefined,
      categoryId: category || undefined,
      status: status ? (status as LotStatus) : undefined,
      minPriceMinor,
      maxPriceMinor,
      reserveMet,
      condition: condition || undefined,
      sort,
      limit: 50,
    });
    usedMeili = true;
  } catch {
    usedMeili = false;
  }

  let lots: Awaited<ReturnType<typeof prisma.lot.findMany>> = [];
  if (usedMeili && lotIds.length > 0) {
    lots = await prisma.lot.findMany({
      where: { id: { in: lotIds } },
      include: { category: true },
    });
    // Preserve Meilisearch ordering.
    const order = new Map(lotIds.map((id, i) => [id, i]));
    lots.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } else {
    // Prisma fallback (also used when Meili returns nothing).
    lots = await prisma.lot.findMany({
      where: {
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { categoryId: category } : {}),
        ...(status ? { status: status as LotStatus } : {}),
        ...(condition ? { condition: condition as Condition } : {}),
        ...(minPriceMinor !== undefined ? { currentBidMinor: { gte: minPriceMinor } } : {}),
        ...(maxPriceMinor !== undefined ? { currentBidMinor: { lte: maxPriceMinor } } : {}),
        ...(reserveMet !== undefined ? { reserveMet } : {}),
      },
      include: { category: true },
      orderBy:
        sort === "ending-soon"
          ? { endAt: "asc" }
          : sort === "newest"
            ? { startAt: "desc" }
            : sort === "most-bids" || sort === "trending"
              ? { bidCount: "desc" }
              : sort === "highest-price"
                ? { currentBidMinor: "desc" }
                : { currentBidMinor: "asc" },
      take: 50,
    });
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Search"
        title="Find your next lot"
        description="Search across all live and upcoming auctions."
      />

      <form className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:flex-wrap">
        <div className="relative flex-1 md:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="text" name="q" defaultValue={q} placeholder="Search lots..." className="pl-9" />
        </div>
        <select name="category" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} selected={c.id === category}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-36">
          <option value="">All statuses</option>
          {Object.values(LotStatus).map((s) => (
            <option key={s} value={s} selected={s === status}>
              {s}
            </option>
          ))}
        </select>
        <select name="condition" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-36">
          <option value="">All conditions</option>
          {Object.values(Condition).map((c) => (
            <option key={c} value={c} selected={c === condition}>
              {c}
            </option>
          ))}
        </select>
        <select name="sort" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-40">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value} selected={s.value === sort}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Input type="number" name="minPrice" defaultValue={minPriceMinor !== undefined ? minPriceMinor / 100 : ""} placeholder="Min $" className="w-24" step="0.01" min="0" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" name="maxPrice" defaultValue={maxPriceMinor !== undefined ? maxPriceMinor / 100 : ""} placeholder="Max $" className="w-24" step="0.01" min="0" />
        </div>
        <select name="reserveMet" className="h-11 rounded-lg border border-input bg-background px-3 text-sm shadow-sm md:w-40">
          <option value="">Reserve: any</option>
          <option value="true" selected={reserveMet === true}>
            Reserve met
          </option>
          <option value="false" selected={reserveMet === false}>
            Reserve not met
          </option>
        </select>
        <Button type="submit" variant="gold" className="shrink-0">
          Search
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {lots.length} result{lots.length === 1 ? "" : "s"}
        {usedMeili ? " · Meilisearch" : " · database"}
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

import { MeiliSearch } from "meilisearch";
import { prisma } from "@/server/db/prisma";
import { LotStatus } from "@prisma/client";

// Meilisearch integration for lot search.
// Documents are denormalized snapshots of lots so the search index can filter
// and sort without joining. The source of truth remains Postgres; the index is
// rebuilt from it (see reindexAllLots) and kept fresh by the worker.

const globalForSearch = globalThis as unknown as { meili?: MeiliSearch };

export function getSearchClient(): MeiliSearch {
  if (!globalForSearch.meili) {
    globalForSearch.meili = new MeiliSearch({
      host: process.env.MEILISEARCH_URL ?? "http://localhost:7703",
      apiKey: process.env.MEILISEARCH_MASTER_KEY ?? "mazadi_dev_master_key",
    });
  }
  return globalForSearch.meili;
}

export const SEARCH_INDEX = "lots";

export interface LotSearchDoc {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sellerId: string;
  sellerName: string;
  status: LotStatus;
  condition: string;
  currency: string;
  currentBidMinor: number;
  startingPriceMinor: number;
  bidCount: number;
  reserveMet: boolean;
  startAt: number;
  endAt: number;
}

/** Ensure the index has the filterable/sortable attributes the UI needs. */
export async function ensureSearchIndex(): Promise<void> {
  const client = getSearchClient();
  // The index must have an explicit primary key (multiple `*Id` fields make
  // Meilisearch's inference ambiguous). If it exists without one, drop and
  // recreate it — the primary key cannot be changed after creation.
  try {
    const info = await client.index(SEARCH_INDEX).fetchInfo();
    if (info.primaryKey !== "id") {
      await client.deleteIndex(SEARCH_INDEX);
      await client.createIndex(SEARCH_INDEX, { primaryKey: "id" });
    }
  } catch {
    // Index does not exist yet — create it.
    await client.createIndex(SEARCH_INDEX, { primaryKey: "id" });
  }
  const index = client.index(SEARCH_INDEX);
  await index.updateFilterableAttributes([
    "categoryId",
    "status",
    "currency",
    "reserveMet",
    "condition",
    "sellerId",
    "endAt",
    "currentBidMinor",
    "bidCount",
    "startAt",
  ]);
  await index.updateSortableAttributes(["endAt", "currentBidMinor", "bidCount", "startAt"]);
}

/** Build the search document for a lot (with its category + seller). */
export async function buildLotDoc(lotId: string): Promise<LotSearchDoc | null> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { category: true, seller: true },
  });
  if (!lot) return null;
  return {
    id: lot.id,
    title: lot.title,
    description: lot.description,
    categoryId: lot.categoryId,
    categoryName: lot.category?.name ?? null,
    sellerId: lot.sellerId,
    sellerName: lot.seller.name,
    status: lot.status,
    condition: lot.condition,
    currency: lot.currency,
    currentBidMinor: lot.currentBidMinor,
    startingPriceMinor: lot.startingPriceMinor,
    bidCount: lot.bidCount,
    reserveMet: lot.reserveMet,
    startAt: lot.startAt.getTime(),
    endAt: lot.endAt.getTime(),
  };
}

/** Index (add or update) a single lot. */
export async function indexLot(lotId: string): Promise<void> {
  const doc = await buildLotDoc(lotId);
  if (!doc) return;
  await getSearchClient().index(SEARCH_INDEX).addDocuments([doc]);
}

/** Rebuild the entire index from Postgres. */
export async function reindexAllLots(): Promise<number> {
  const lots = await prisma.lot.findMany({
    include: { category: true, seller: true },
  });
  const docs: LotSearchDoc[] = lots.map((lot) => ({
    id: lot.id,
    title: lot.title,
    description: lot.description,
    categoryId: lot.categoryId,
    categoryName: lot.category?.name ?? null,
    sellerId: lot.sellerId,
    sellerName: lot.seller.name,
    status: lot.status,
    condition: lot.condition,
    currency: lot.currency,
    currentBidMinor: lot.currentBidMinor,
    startingPriceMinor: lot.startingPriceMinor,
    bidCount: lot.bidCount,
    reserveMet: lot.reserveMet,
    startAt: lot.startAt.getTime(),
    endAt: lot.endAt.getTime(),
  }));
  if (docs.length > 0) {
    await getSearchClient().index(SEARCH_INDEX).addDocuments(docs);
  }
  return docs.length;
}

export interface SearchLotsParams {
  q?: string;
  categoryId?: string;
  status?: LotStatus;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  sellerId?: string;
  reserveMet?: boolean;
  condition?: string;
  sort?: "ending-soon" | "newest" | "most-bids" | "highest-price" | "lowest-price" | "trending";
  limit?: number;
}

const SORT_MAP: Record<NonNullable<SearchLotsParams["sort"]>, string> = {
  "ending-soon": "endAt:asc",
  newest: "startAt:desc",
  "most-bids": "bidCount:desc",
  "highest-price": "currentBidMinor:desc",
  "lowest-price": "currentBidMinor:asc",
  trending: "bidCount:desc",
};

/**
 * Query Meilisearch for lots. Returns matching lot ids (ordered) so the caller
 * can hydrate full records from Prisma. Throws if the index is unreachable.
 */
export async function searchLots(params: SearchLotsParams): Promise<string[]> {
  const filters: string[] = [];
  if (params.categoryId) filters.push(`categoryId = "${params.categoryId}"`);
  if (params.status) filters.push(`status = "${params.status}"`);
  if (params.sellerId) filters.push(`sellerId = "${params.sellerId}"`);
  if (params.reserveMet !== undefined) filters.push(`reserveMet = ${params.reserveMet}`);
  if (params.condition) filters.push(`condition = "${params.condition}"`);
  if (params.minPriceMinor !== undefined) filters.push(`currentBidMinor >= ${params.minPriceMinor}`);
  if (params.maxPriceMinor !== undefined) filters.push(`currentBidMinor <= ${params.maxPriceMinor}`);

  const result = await getSearchClient().index(SEARCH_INDEX).search(params.q ?? "", {
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    sort: params.sort ? [SORT_MAP[params.sort]] : undefined,
    limit: params.limit ?? 50,
    attributesToRetrieve: ["id"],
  });

  return result.hits.map((h) => h.id as string);
}

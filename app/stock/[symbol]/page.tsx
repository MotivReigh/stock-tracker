import { notFound } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { StockHeader } from "@/components/stock/stock-header";
import { KeyStats } from "@/components/stock/key-stats";
import { NewsList } from "@/components/stock/news-list";
import { JournalSection } from "@/components/journal/journal-section";
import { listNotesForSymbol } from "@/lib/journal/queries";
import { PriceChart } from "@/components/stock/price-chart";
import { RecommendationsPanel } from "@/components/stock/recommendations-panel";
import { getStockDetail, isStockUnknown } from "@/lib/stock/data";
import { getCurrentUserId } from "@/lib/auth/user";
import {
  listWatchlists,
  listWatchlistsContainingSymbol,
} from "@/lib/watchlists/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  if (!/^[A-Z0-9.-]{1,10}$/i.test(symbol)) {
    notFound();
  }

  const detail = await getStockDetail(symbol);
  if (isStockUnknown(detail)) {
    notFound();
  }

  const userId = getCurrentUserId();
  const [allLists, containingIds, notes] = await Promise.all([
    listWatchlists(userId),
    listWatchlistsContainingSymbol(userId, detail.symbol),
    listNotesForSymbol(userId, detail.symbol),
  ]);
  const watchlistEntries = allLists.map((l) => ({ id: l.id, name: l.name }));

  return (
    <Shell>
      <div className="min-h-full">
        <StockHeader
          detail={detail}
          watchlists={watchlistEntries}
          containingIds={containingIds}
        />
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <PriceChart bars={detail.bars} />
              <RecommendationsPanel
                recommendations={detail.recommendations}
                symbol={detail.symbol}
              />
            </div>
            <div className="xl:col-span-1">
              <KeyStats detail={detail} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <NewsList news={detail.news} symbol={detail.symbol} />
            </div>
            <div className="lg:col-span-1">
              <JournalSection symbol={detail.symbol} notes={notes} />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

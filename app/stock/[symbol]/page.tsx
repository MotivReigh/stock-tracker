import { notFound } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { StockHeader } from "@/components/stock/stock-header";
import { KeyStats } from "@/components/stock/key-stats";
import { NewsList } from "@/components/stock/news-list";
import { JournalPlaceholder } from "@/components/stock/journal-placeholder";
import { PriceChart } from "@/components/stock/price-chart";
import { getStockDetail, isStockUnknown } from "@/lib/stock/data";

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

  return (
    <Shell>
      <div className="min-h-full">
        <StockHeader detail={detail} />
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <PriceChart bars={detail.bars} />
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
              <JournalPlaceholder symbol={detail.symbol} />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

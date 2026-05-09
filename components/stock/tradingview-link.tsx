import { ExternalLink } from "lucide-react";

export function TradingViewLink({ symbol }: { symbol: string }) {
  const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 border border-app rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      Open in TradingView
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

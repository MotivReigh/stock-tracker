import type { FinnhubNewsItem } from "@/lib/finnhub/types";

export function NewsList({ news, symbol }: { news: FinnhubNewsItem[]; symbol: string }) {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          News · {symbol}
        </h3>
        <span className="text-[10px] font-mono text-muted">last 14 days</span>
      </div>
      {news.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted">
          No recent news for {symbol}.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {news.slice(0, 12).map((n) => (
            <li
              key={n.id}
              className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted mb-1">
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(n.datetime * 1000)}</span>
                  {n.category && (
                    <>
                      <span>·</span>
                      <span className="uppercase">{n.category}</span>
                    </>
                  )}
                </div>
                <h4 className="font-medium leading-snug text-sm">{n.headline}</h4>
                {n.summary && (
                  <p className="text-xs text-muted mt-1 line-clamp-2">
                    {n.summary}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

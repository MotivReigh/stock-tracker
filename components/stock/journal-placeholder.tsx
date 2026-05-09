import { BookOpenText } from "lucide-react";

export function JournalPlaceholder({ symbol }: { symbol: string }) {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Journal · {symbol}
        </h3>
      </div>
      <div className="px-4 py-8 text-center">
        <BookOpenText className="h-6 w-6 mx-auto text-muted mb-2" />
        <p className="text-sm text-muted">Notes editor lands in phase 8</p>
        <p className="text-[11px] text-muted mt-1">
          Markdown notes per ticker for entry rationale and observations.
        </p>
      </div>
    </div>
  );
}

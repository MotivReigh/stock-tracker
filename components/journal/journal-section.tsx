import { BookOpenText } from "lucide-react";
import { NoteEditor } from "./note-editor";
import { NoteRow } from "./note-row";
import type { JournalNote } from "@/lib/journal/queries";

export function JournalSection({
  symbol,
  notes,
}: {
  symbol: string;
  notes: JournalNote[];
}) {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <h3 className="font-bold text-[13px] uppercase tracking-wider flex items-center gap-1.5">
          <BookOpenText className="h-3.5 w-3.5" />
          Journal · {symbol}
        </h3>
        <span className="text-[10px] font-mono text-muted">
          {notes.length} note{notes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="px-3 py-3 border-b border-app bg-slate-50/40 dark:bg-slate-900/30">
        <NoteEditor mode="create" symbol={symbol} />
      </div>

      {notes.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted">
          No notes yet for {symbol}. Add one above.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {notes.map((n) => (
            <NoteRow key={n.id} note={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

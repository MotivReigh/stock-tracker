"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "./note-editor";
import { deleteNoteAction } from "@/app/journal/actions";
import type { JournalNote } from "@/lib/journal/queries";

export function NoteRow({
  note,
  showSymbol = false,
}: {
  note: JournalNote;
  showSymbol?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      "Delete this note? This cannot be undone.",
    );
    if (!ok) e.preventDefault();
  }

  if (editing) {
    return (
      <li className="px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="font-mono">
            Editing · {formatRelativeTime(new Date(note.created_at).getTime())}
          </span>
        </div>
        <NoteEditor
          mode="edit"
          id={note.id}
          initialBody={note.body}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="px-3 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 group">
      <div className="flex items-center justify-between gap-2 text-xs text-muted mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {showSymbol && (
            <Link
              href={`/stock/${note.symbol}`}
              className="font-mono font-bold text-slate-700 dark:text-slate-200 hover:underline"
            >
              {note.symbol}
            </Link>
          )}
          <span className="font-mono">
            {formatTimestamp(note.created_at)}
          </span>
          {note.updated_at !== note.created_at && (
            <span className="font-mono text-[10px]">
              · edited {formatRelativeTime(new Date(note.updated_at).getTime())}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit note"
            onClick={() => setEditing(true)}
            className="h-6 w-6"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <form action={deleteNoteAction} onSubmit={confirmDelete}>
            <input type="hidden" name="id" value={note.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Delete note"
              className="h-6 w-6 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </form>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
        {note.body}
      </p>
    </li>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

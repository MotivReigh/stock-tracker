"use client";

import { useActionState, useRef, useEffect } from "react";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createNoteAction,
  updateNoteAction,
  type ActionResult,
} from "@/app/journal/actions";

type CreateProps = {
  mode: "create";
  symbol: string;
  onDone?: () => void;
};

type EditProps = {
  mode: "edit";
  id: string;
  initialBody: string;
  onDone: () => void;
};

export function NoteEditor(props: CreateProps | EditProps) {
  const action =
    props.mode === "create" ? createNoteAction : updateNoteAction;
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(action, null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to a sensible max.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handle = () => {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 400) + "px";
    };
    handle();
    el.addEventListener("input", handle);
    return () => el.removeEventListener("input", handle);
  }, []);

  useEffect(() => {
    if (state?.ok) {
      if (props.mode === "create" && textareaRef.current) {
        textareaRef.current.value = "";
        textareaRef.current.style.height = "auto";
      }
      if (props.onDone) props.onDone();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-2">
      {props.mode === "create" ? (
        <input type="hidden" name="symbol" value={props.symbol} />
      ) : (
        <input type="hidden" name="id" value={props.id} />
      )}
      <textarea
        ref={textareaRef}
        name="body"
        defaultValue={props.mode === "edit" ? props.initialBody : ""}
        required
        maxLength={10_000}
        placeholder={
          props.mode === "create"
            ? "What are you seeing? Entry rationale, levels to watch, exit plan, observations…"
            : "Edit note…"
        }
        className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-3 py-2 text-sm leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-terminal-500/40 resize-none min-h-[6rem]"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {props.mode === "create" ? (
            <>
              <Plus className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save note"}
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save"}
            </>
          )}
        </Button>
        {props.mode === "edit" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={props.onDone}
            disabled={pending}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
        {state && !state.ok && (
          <span className="text-xs text-rose-600 dark:text-rose-400">
            {state.error}
          </span>
        )}
        <span
          className={cn(
            "ml-auto text-[10px] font-mono text-muted",
            props.mode === "create" && "hidden sm:inline",
          )}
        >
          markdown supported (plain text rendered)
        </span>
      </div>
    </form>
  );
}

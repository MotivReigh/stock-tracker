"use client";

import { useState, useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createCustomScanAction,
  type ActionResult,
} from "@/app/scans/actions";
import type {
  Indicator,
  Operator,
  Predicate,
  ScanCondition,
  ScanDefinition,
} from "@/lib/scans/types";

const INDICATOR_LABELS: Record<Indicator, string> = {
  price: "Price ($)",
  pctChange1d: "% change · 1D",
  pctChange5d: "% change · 1W",
  pctChange21d: "% change · 1M",
  pctChange63d: "% change · 3M",
  relVol: "Relative volume (×)",
  rsScore: "RS score (0-100)",
  rsi: "RSI(14)",
  macdHistogram: "MACD histogram",
  smaSlope20: "SMA20 slope %",
  atrPct: "ATR % of price",
  fiftyTwoWeekHighDistance: "Days since 52W high",
  marketCap: "Market cap (USD)",
};

const PREDICATE_LABELS: Record<Predicate, string> = {
  maAligned: "MA alignment (20>50>200)",
  maCompression: "MA compression",
  breakout52wHigh: "Breaks 52-week high",
  breakout50dHigh: "Breaks 50-day high",
  tightConsolidation: "Tight consolidation",
  volumeDryUp: "Volume dry-up",
  pullbackToMa20: "Pullback to 20-MA",
  pullbackToMa50: "Pullback to 50-MA",
};

const INDICATORS = Object.keys(INDICATOR_LABELS) as Indicator[];
const PREDICATES = Object.keys(PREDICATE_LABELS) as Predicate[];
const OPERATORS: Operator[] = [">", ">=", "<", "<=", "=", "between"];

type ConditionRow =
  | (Extract<ScanCondition, { kind: "numeric" }> & { rowId: string })
  | (Extract<ScanCondition, { kind: "predicate" }> & { rowId: string });

let rowSeq = 0;
const newRowId = () => `row-${++rowSeq}-${Date.now()}`;

const initialCondition = (): ConditionRow => ({
  rowId: newRowId(),
  kind: "numeric",
  indicator: "pctChange1d",
  operator: ">=",
  value: 5,
});

export function ScanBuilder() {
  const [name, setName] = useState("");
  const [combinator, setCombinator] = useState<"and" | "or">("and");
  const [conditions, setConditions] = useState<ConditionRow[]>([
    initialCondition(),
  ]);

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createCustomScanAction,
    null,
  );

  function updateRow(rowId: string, patch: Partial<ConditionRow>) {
    setConditions((rows) =>
      rows.map((r) => (r.rowId === rowId ? ({ ...r, ...patch } as ConditionRow) : r)),
    );
  }

  function setKind(rowId: string, kind: "numeric" | "predicate") {
    setConditions((rows) =>
      rows.map((r): ConditionRow => {
        if (r.rowId !== rowId) return r;
        if (kind === "numeric") {
          return {
            rowId: r.rowId,
            kind: "numeric",
            indicator: "pctChange1d",
            operator: ">=",
            value: 5,
          };
        }
        return {
          rowId: r.rowId,
          kind: "predicate",
          predicate: "maAligned",
          expected: true,
        };
      }),
    );
  }

  function addRow() {
    setConditions((rows) => [...rows, initialCondition()]);
  }

  function removeRow(rowId: string) {
    setConditions((rows) =>
      rows.length > 1 ? rows.filter((r) => r.rowId !== rowId) : rows,
    );
  }

  // Serialize for submission. Strip rowId.
  const definition: ScanDefinition = {
    version: 1,
    combinator,
    conditions: conditions.map((c): ScanCondition => {
      if (c.kind === "numeric") {
        return {
          kind: "numeric",
          indicator: c.indicator,
          operator: c.operator,
          value: Number(c.value),
          ...(c.operator === "between" ? { valueHi: Number(c.valueHi ?? 0) } : {}),
        };
      }
      return {
        kind: "predicate",
        predicate: c.predicate,
        expected: c.expected,
      };
    }),
  };

  const payload = JSON.stringify({ name: name.trim(), definition });
  const isValid =
    name.trim().length > 0 &&
    conditions.length > 0 &&
    conditions.every((c) => c.kind === "predicate" || !Number.isNaN(Number(c.value)));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="border border-app bg-panel rounded-md p-4">
        <label
          htmlFor="scan-name"
          className="block text-xs uppercase tracking-wider font-semibold text-muted mb-1.5"
        >
          Scan name
        </label>
        <input
          id="scan-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          placeholder="e.g. AI Semis With Volume"
          className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
        />
      </div>

      <div className="border border-app bg-panel rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted">
              Conditions
            </div>
            <div className="text-xs text-muted">
              Join with{" "}
              <button
                type="button"
                onClick={() => setCombinator("and")}
                className={cn(
                  "font-mono px-1.5 py-0.5 rounded text-[11px] mr-1",
                  combinator === "and"
                    ? "bg-terminal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                )}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => setCombinator("or")}
                className={cn(
                  "font-mono px-1.5 py-0.5 rounded text-[11px]",
                  combinator === "or"
                    ? "bg-terminal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                )}
              >
                OR
              </button>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            Add condition
          </Button>
        </div>

        <ul className="space-y-2">
          {conditions.map((c) => (
            <li
              key={c.rowId}
              className="border border-app rounded-md p-3 bg-slate-50/60 dark:bg-slate-900/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* Kind selector */}
                <div className="flex text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setKind(c.rowId, "numeric")}
                    className={cn(
                      "px-2 py-1 border border-app rounded-l",
                      c.kind === "numeric"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-transparent",
                    )}
                  >
                    Numeric
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind(c.rowId, "predicate")}
                    className={cn(
                      "px-2 py-1 border border-l-0 border-app rounded-r",
                      c.kind === "predicate"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-transparent",
                    )}
                  >
                    True / false
                  </button>
                </div>

                {c.kind === "numeric" ? (
                  <>
                    <select
                      value={c.indicator}
                      onChange={(e) =>
                        updateRow(c.rowId, { indicator: e.target.value as Indicator })
                      }
                      className="bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-8 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
                    >
                      {INDICATORS.map((i) => (
                        <option key={i} value={i}>
                          {INDICATOR_LABELS[i]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.operator}
                      onChange={(e) =>
                        updateRow(c.rowId, { operator: e.target.value as Operator })
                      }
                      className="bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={c.value}
                      onChange={(e) =>
                        updateRow(c.rowId, {
                          value: Number(e.target.value),
                        })
                      }
                      className="w-24 bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
                    />
                    {c.operator === "between" && (
                      <>
                        <span className="text-xs text-muted">and</span>
                        <input
                          type="number"
                          step="any"
                          value={c.valueHi ?? ""}
                          onChange={(e) =>
                            updateRow(c.rowId, {
                              valueHi: Number(e.target.value),
                            })
                          }
                          className="w-24 bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <select
                      value={c.predicate}
                      onChange={(e) =>
                        updateRow(c.rowId, { predicate: e.target.value as Predicate })
                      }
                      className="bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-8 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
                    >
                      {PREDICATES.map((p) => (
                        <option key={p} value={p}>
                          {PREDICATE_LABELS[p]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.expected ? "true" : "false"}
                      onChange={(e) =>
                        updateRow(c.rowId, { expected: e.target.value === "true" })
                      }
                      className="bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
                    >
                      <option value="true">is true</option>
                      <option value="false">is false</option>
                    </select>
                  </>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove condition"
                  onClick={() => removeRow(c.rowId)}
                  disabled={conditions.length === 1}
                  className="ml-auto text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!isValid || pending}>
          {pending ? "Saving…" : "Save scan"}
        </Button>
        {state && !state.ok && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
        )}
        <p className="text-xs text-muted ml-auto">
          The scan won't run automatically until you click <em>Run now</em> on
          its results page or the cron fires.
        </p>
      </div>
    </form>
  );
}

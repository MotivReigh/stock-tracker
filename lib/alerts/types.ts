/**
 * Cross-cutting types for the alerts subsystem.
 */
import type { ResultSnapshot } from "@/lib/scans/types";

export type AlertChannel = "push" | "slack" | "sms";

/** Row shape in updraft_alerts. */
export type AlertRow = {
  id: string;
  scan_result_id: string;
  channels: AlertChannel[];
  fired_at: string;
  delivered_at: string | null;
  error: string | null;
};

/** Per-channel send result returned by adapters. */
export type SendResult =
  | { ok: true; channel: AlertChannel }
  | { ok: false; channel: AlertChannel; error: string };

/** The shape passed to each channel adapter. */
export type AlertPayload = {
  scanName: string;
  scanId: string;
  scanResultId: string;
  symbol: string;
  snapshot: ResultSnapshot;
  /** Fully-qualified URL to the stock page (for buttons / links). */
  stockUrl: string;
  /** "pre-breakout" | "just-broke-out" | "established-trend" | "momentum" */
  stage: string;
};

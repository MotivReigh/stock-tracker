"use client";

import { useActionState, useState, useTransition } from "react";
import { ExternalLink, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  saveSlackWebhookAction,
  sendSlackTestAction,
  type ActionResult,
} from "@/app/settings/actions";

export function SlackSetup({
  webhookUrl,
  enabled,
}: {
  webhookUrl: string | null;
  enabled: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState<
    ActionResult | null,
    FormData
  >(saveSlackWebhookAction, null);

  const [testResult, setTestResult] = useState<ActionResult | null>(null);
  const [testPending, startTest] = useTransition();

  const masked = webhookUrl
    ? webhookUrl.slice(0, 32) + "…" + webhookUrl.slice(-6)
    : "";

  function handleTest() {
    setTestResult(null);
    startTest(async () => {
      const r = await sendSlackTestAction();
      setTestResult(r);
    });
  }

  return (
    <section className="border border-app rounded-md bg-panel p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 grid place-items-center">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Slack</h3>
          <p className="text-xs text-muted">
            Paste an incoming-webhook URL from{" "}
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              api.slack.com/apps
              <ExternalLink className="h-3 w-3" />
            </a>
            . Create app → Incoming Webhooks → add to channel/DM → copy URL.
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded",
            enabled
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <form action={saveAction} className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          name="webhook_url"
          defaultValue={webhookUrl ?? ""}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-3 h-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
        />
        <Button type="submit" size="md" disabled={savePending}>
          {savePending ? "Saving…" : "Save"}
        </Button>
      </form>
      {webhookUrl && !saveState && (
        <p className="text-xs text-muted font-mono">Current: {masked}</p>
      )}
      {saveState && (
        <p
          className={cn(
            "text-xs",
            saveState.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
          )}
        >
          {saveState.ok ? saveState.message : saveState.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testPending || !webhookUrl}
        >
          <Send className="h-3.5 w-3.5" />
          {testPending ? "Sending…" : "Send test message"}
        </Button>
        {testResult && (
          <span
            className={cn(
              "text-xs",
              testResult.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {testResult.ok ? testResult.message : testResult.error}
          </span>
        )}
      </div>
    </section>
  );
}

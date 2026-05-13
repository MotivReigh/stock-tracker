"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendPushTestAction, type ActionResult } from "@/app/settings/actions";

type Status = "loading" | "unsupported" | "denied" | "subscribed" | "default";

/** Convert URL-safe base64 (used for VAPID public keys) to Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSetup({ subscriptionCount }: { subscriptionCount: number }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ActionResult | null>(null);
  const [testPending, startTest] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    refreshStatus();
  }, []);

  async function refreshStatus() {
    try {
      const perm = Notification.permission;
      if (perm === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub && perm === "granted") {
        setStatus("subscribed");
      } else {
        setStatus("default");
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus("default");
    }
  }

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        setBusy(false);
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // PushManager.subscribe expects BufferSource. Recent TS lib types
        // narrow Uint8Array's buffer to ArrayBufferLike (a superset of
        // ArrayBuffer) which no longer matches BufferSource — cast through.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const json = sub.toJSON();
      const res = await fetch("/api/alerts/subscribe-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) {
        throw new Error(`Server rejected subscription (${res.status})`);
      }
      setStatus("subscribed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/alerts/unsubscribe-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("default");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleTest() {
    setTestResult(null);
    startTest(async () => {
      const r = await sendPushTestAction();
      setTestResult(r);
    });
  }

  const enabled = status === "subscribed";

  return (
    <section className="border border-app rounded-md bg-panel p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-terminal-50 dark:bg-terminal-900/40 text-terminal-700 dark:text-terminal-400 grid place-items-center">
          <Bell className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Browser Push</h3>
          <p className="text-xs text-muted">
            Get notifications even when Updraft is closed. Works on macOS,
            Windows, Linux and Android Chrome. iOS Safari requires the site
            to be added to the home screen first.
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
          {status === "loading"
            ? "…"
            : status === "subscribed"
              ? "Enabled"
              : status === "denied"
                ? "Denied"
                : status === "unsupported"
                  ? "Unsupported"
                  : "Disabled"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === "subscribed" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={unsubscribe}
              disabled={busy}
            >
              {busy ? "Working…" : "Unsubscribe"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testPending}
            >
              <Send className="h-3.5 w-3.5" />
              {testPending ? "Sending…" : "Send test push"}
            </Button>
          </>
        )}
        {status === "default" && (
          <Button
            type="button"
            size="sm"
            onClick={subscribe}
            disabled={busy}
          >
            {busy ? "Granting…" : "Grant permission"}
          </Button>
        )}
        {status === "denied" && (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            Push permission is blocked in browser settings. Re-enable for this
            site and reload.
          </p>
        )}
        {status === "unsupported" && (
          <p className="text-xs text-muted">
            This browser doesn't support Web Push. Try Chrome, Edge, or
            Firefox.
          </p>
        )}
      </div>

      {(error || testResult) && (
        <div className="text-xs">
          {error && (
            <p className="text-rose-600 dark:text-rose-400">{error}</p>
          )}
          {testResult && (
            <p
              className={cn(
                testResult.ok
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {testResult.ok ? testResult.message : testResult.error}
            </p>
          )}
        </div>
      )}

      {subscriptionCount > 0 && (
        <p className="text-[11px] text-muted font-mono">
          {subscriptionCount} active subscription{subscriptionCount === 1 ? "" : "s"} on file
        </p>
      )}
    </section>
  );
}

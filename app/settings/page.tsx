import { Settings as SettingsIcon } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { SlackSetup } from "@/components/settings/slack-setup";
import { PushSetup } from "@/components/settings/push-setup";
import { SmsSetup } from "@/components/settings/sms-setup";
import { getCurrentUserId } from "@/lib/auth/user";
import { getSettings } from "@/lib/settings/queries";
import { getPushSubscriptions } from "@/lib/alerts/push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const userId = getCurrentUserId();
  const [settings, subscriptions] = await Promise.all([
    getSettings(userId),
    getPushSubscriptions(userId).catch(() => []),
  ]);

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            Phase 7 · Alerts
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-terminal-600 dark:text-terminal-400" />
            Notifications
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Choose how Updraft tells you when a scan triggers. Failures on one
            channel don't block the others — if Slack is down, push still
            fires, and vice versa.
          </p>
        </header>

        <div className="space-y-3">
          <PushSetup subscriptionCount={subscriptions.length} />
          <SlackSetup
            webhookUrl={settings.slack_webhook_url}
            enabled={settings.slack_enabled}
          />
          <SmsSetup />
        </div>

        <section className="text-xs text-muted">
          <p>
            Channel state lives in <code className="font-mono">updraft_settings</code>{" "}
            and is read by the dispatcher on every scan-trigger so changes take
            effect immediately. The bootstrap account's settings row was
            inserted by migration 0001.
          </p>
        </section>
      </div>
    </Shell>
  );
}

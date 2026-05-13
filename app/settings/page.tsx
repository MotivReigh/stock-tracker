import { Settings as SettingsIcon } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { SlackSetup } from "@/components/settings/slack-setup";
import { PushSetup } from "@/components/settings/push-setup";
import { SmsSetup } from "@/components/settings/sms-setup";
import { DisplayPreferences } from "@/components/settings/display-preferences";
import { AccountInfo } from "@/components/settings/account-info";
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
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            Preferences
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-terminal-600 dark:text-terminal-400" />
            Settings
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Configure notifications, choose your display style, and manage the
            account that gates this app.
          </p>
        </header>

        <SettingsGroup
          label="Notifications"
          hint="Failures on one channel don't block the others — if Slack is down, push still fires."
        >
          <PushSetup subscriptionCount={subscriptions.length} />
          <SlackSetup
            webhookUrl={settings.slack_webhook_url}
            enabled={settings.slack_enabled}
          />
          <SmsSetup />
        </SettingsGroup>

        <SettingsGroup label="Appearance">
          <DisplayPreferences />
        </SettingsGroup>

        <SettingsGroup label="Account">
          <AccountInfo />
        </SettingsGroup>

        <p className="text-[11px] text-muted">
          Channel state lives in{" "}
          <code className="font-mono">updraft_settings</code> and is read by
          the dispatcher on every scan-trigger so changes take effect
          immediately.
        </p>
      </div>
    </Shell>
  );
}

function SettingsGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

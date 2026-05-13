/**
 * updraft_settings CRUD. One row per user (bootstrap user has a row
 * created by migration 0001). Single source of truth for which alert
 * channels are enabled and the Slack webhook URL.
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";

export type Settings = {
  user_id: string;
  slack_webhook_url: string | null;
  push_enabled: boolean;
  slack_enabled: boolean;
  sms_enabled: boolean;
  theme: "light" | "dark";
  dashboard_layout: "terminal" | "editorial";
  updated_at: string;
};

export async function getSettings(userId: string): Promise<Settings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.settings)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getSettings: ${error.message}`);
  if (!data) {
    // Insert default row defensively (migration also does this for bootstrap user).
    const { data: created, error: insertErr } = await supabase
      .from(TABLES.settings)
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertErr) throw new Error(`getSettings/insert: ${insertErr.message}`);
    return created as Settings;
  }
  return data as Settings;
}

export type SettingsPatch = Partial<
  Pick<
    Settings,
    | "slack_webhook_url"
    | "push_enabled"
    | "slack_enabled"
    | "sms_enabled"
    | "theme"
    | "dashboard_layout"
  >
>;

export async function updateSettings(
  userId: string,
  patch: SettingsPatch,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.settings)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(`updateSettings: ${error.message}`);
}

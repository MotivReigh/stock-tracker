import { describe, it, expect } from "vitest";
import { enabledChannels } from "@/lib/alerts/dispatcher";

describe("enabledChannels", () => {
  it("includes only channels with their boolean flag set", () => {
    expect(
      enabledChannels({
        push_enabled: true,
        slack_enabled: false,
        sms_enabled: false,
        slack_webhook_url: null,
      }),
    ).toEqual(["push"]);
  });

  it("requires slack_webhook_url to be present when slack_enabled is true", () => {
    expect(
      enabledChannels({
        push_enabled: false,
        slack_enabled: true,
        sms_enabled: false,
        slack_webhook_url: null,
      }),
    ).toEqual([]); // slack toggled on but no webhook → skipped

    expect(
      enabledChannels({
        push_enabled: false,
        slack_enabled: true,
        sms_enabled: false,
        slack_webhook_url: "https://hooks.slack.com/services/A/B/C",
      }),
    ).toEqual(["slack"]);
  });

  it("returns multiple channels when several are enabled", () => {
    const r = enabledChannels({
      push_enabled: true,
      slack_enabled: true,
      sms_enabled: true,
      slack_webhook_url: "https://hooks.slack.com/services/A/B/C",
    });
    expect(r).toContain("push");
    expect(r).toContain("slack");
    expect(r).toContain("sms");
    expect(r).toHaveLength(3);
  });

  it("returns [] when nothing is enabled", () => {
    expect(
      enabledChannels({
        push_enabled: false,
        slack_enabled: false,
        sms_enabled: false,
        slack_webhook_url: null,
      }),
    ).toEqual([]);
  });
});

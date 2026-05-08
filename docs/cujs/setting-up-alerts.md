# CUJ 4: Setting Up Alerts

## Goal
Subscribe to browser push notifications, connect a Slack incoming webhook, send test messages, and receive live alerts when scans trigger.

## Primary user flow

1. User navigates to `/settings`.
2. **Notifications** section shows three rows:
   - **Browser Push** — toggle, current state ("Granted" / "Not granted"), "Send test push" button
   - **Slack** — webhook URL input (masked after save), "Send test message" button, link to "How to get a webhook"
   - **SMS (coming soon)** — disabled toggle with "Available post-MVP" tag
3. **Browser Push flow**:
   - Toggle on → browser permission prompt → on grant, subscription POSTed to `/api/alerts/subscribe-push` → row inserted into `updraft_push_subscriptions` → "Granted" status shows
   - "Send test push" → calls `/api/alerts/test-push` → user receives notification
4. **Slack flow**:
   - User clicks "How to get a webhook" → opens docs explaining: visit api.slack.com/apps → create app → enable Incoming Webhooks → add to channel/DM → copy URL
   - User pastes URL → Save → URL stored in `updraft_settings.slack_webhook_url`
   - "Send test message" → calls `/api/alerts/test-slack` → posts Block Kit test message to the configured channel
5. When a scan fires (cron-driven), the alerts dispatcher reads enabled channels per user and fans out:
   - Push: web-push send to all subscriptions
   - Slack: POST Block Kit payload to webhook
   - Dashboard badge: row appears in `/` Alerts panel within 60s
6. A failed channel records its error in `updraft_alerts.error` but does not block other channels.

## Test scenarios

| # | Scenario | Type | Expected behavior |
|---|---|---|---|
| 4.1 | Grant push permission | E2E | Browser permission prompt appears; on grant, status switches to "Granted"; subscription row exists |
| 4.2 | Send test push | E2E | Notification received within 5s containing "Updraft test push" |
| 4.3 | Save Slack webhook | E2E | URL persisted to `updraft_settings`; field shows masked value on reload |
| 4.4 | Send Slack test with valid webhook | E2E | Slack channel receives Block Kit test message with "Updraft test alert" |
| 4.5 | Send Slack test with empty webhook | E2E | 400 response; inline error "No webhook configured" |
| 4.6 | Live trigger fans out to all channels | Integration | Insert into `updraft_scan_results` → dispatcher fires → push received + slack received + dashboard badge appears |
| 4.7 | Slack failure does not block push | Integration | Mock Slack 500; assert push still sent; `updraft_alerts.error` records Slack failure |
| 4.8 | SMS toggle disabled | E2E | Toggle is disabled; tooltip "Available post-MVP" |

## Related source files

- `app/settings/page.tsx`
- `components/settings/{PushSetup,SlackSetup,SmsSetup}.tsx`
- `app/api/alerts/subscribe-push/route.ts`
- `app/api/alerts/test-push/route.ts`
- `app/api/alerts/test-slack/route.ts`
- `app/api/cron/dispatch-alerts/route.ts`
- `lib/alerts/{push,slack,sms,dispatcher}.ts`

## Slack Block Kit message shape

```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "🚀 Updraft: MU just broke out" } },
    { "type": "section", "fields": [
      { "type": "mrkdwn", "text": "*Scan*\n52W High + Volume Surge" },
      { "type": "mrkdwn", "text": "*Price*\n$112.45 (+2.8%)" },
      { "type": "mrkdwn", "text": "*Rel Vol*\n3.5×" },
      { "type": "mrkdwn", "text": "*RS*\n96" }
    ] },
    { "type": "actions", "elements": [
      { "type": "button", "text": { "type": "plain_text", "text": "Open in Updraft" }, "url": "https://updraft.example.com/stock/MU?scan=just-broke-out-52w" }
    ] },
    { "type": "context", "elements": [
      { "type": "mrkdwn", "text": "_Personal use · Not financial advice_" }
    ] }
  ]
}
```

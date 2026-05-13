/**
 * SMS adapter (Twilio-shaped) — no-op stub for MVP.
 *
 * The interface is identical to a real Twilio send so swapping in the actual
 * adapter post-MVP is a one-file change. Until then, calls succeed silently
 * and the UI displays "SMS coming soon".
 */
import type { AlertPayload, SendResult } from "./types";

export async function sendSmsAlert(
  _phoneNumber: string | null,
  _payload: AlertPayload,
): Promise<SendResult> {
  return {
    ok: false,
    channel: "sms",
    error: "SMS adapter stubbed — Twilio integration is post-MVP",
  };
}

export async function sendSmsTest(): Promise<SendResult> {
  return {
    ok: false,
    channel: "sms",
    error: "SMS adapter stubbed — Twilio integration is post-MVP",
  };
}

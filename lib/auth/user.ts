/**
 * Resolve the current user id.
 *
 * MVP is single-user: returns the bootstrap UUID inserted by migration 0001.
 * When we wire real auth (post-MVP), this becomes session-aware and the rest
 * of the app keeps working unchanged because every query already filters by
 * the returned id.
 */
import { SINGLE_USER_ID } from "@/lib/db/tables";

export function getCurrentUserId(): string {
  return SINGLE_USER_ID;
}

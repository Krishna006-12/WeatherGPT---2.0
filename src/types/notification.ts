/**
 * Notification Dispatch Type Definitions — WeatherGPT 2.0.
 *
 * Defines contracts for multi-channel alert dispatching.
 */

import type { Alert } from "./alert";
import type { ISOTimestamp, Result } from "./common";

export type NotificationChannel = "in_app" | "browser" | "sms" | "push";

export type NotificationStatus =
  | "dispatched"
  | "queued"
  | "unsupported"
  | "permission_denied"
  | "failed";

export interface NotificationPayload {
  id: string;
  alert: Alert;
  channel: NotificationChannel;
  title: string;
  body: string;
  recipient?: string;
  timestamp: ISOTimestamp;
}

export interface NotificationDispatchResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  dispatched: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  dispatch(payload: NotificationPayload): Promise<Result<NotificationDispatchResult>>;
}

/**
 * Multi-Channel Notification Dispatcher — WeatherGPT 2.0.
 *
 * Implements Phase 5 notification dispatch interface:
 * - Active, functional In-App notification provider with queueing and history
 * - Active Browser Web Notification provider (with permission/environment gating)
 * - Type-safe interface-only stubs for SMS and Web Push (per architectural rule: no faked integrations)
 */

import type { Result } from "@/types/common";
import type { Alert } from "@/types/alert";
import type {
  NotificationChannel,
  NotificationDispatchResult,
  NotificationPayload,
  NotificationProvider,
} from "@/types/notification";

/**
 * Functional in-app notification provider.
 * Stores alerts in an in-memory event queue accessible to the frontend notification badge / toast center.
 */
export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = "in_app" as const;
  private notifications: NotificationPayload[] = [];

  async dispatch(payload: NotificationPayload): Promise<Result<NotificationDispatchResult>> {
    this.notifications.unshift(payload);
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    return {
      success: true,
      data: {
        channel: "in_app",
        status: "dispatched",
        dispatched: true,
        providerMessageId: `in_app_${payload.id}`,
      },
    };
  }

  getNotifications(): NotificationPayload[] {
    return [...this.notifications];
  }

  clear(): void {
    this.notifications = [];
  }
}

/**
 * Functional HTML5 Web Notifications provider.
 * Safely handles server-side rendering (SSR), permission denials, and active browser windows.
 */
export class BrowserNotificationProvider implements NotificationProvider {
  readonly channel = "browser" as const;

  async dispatch(payload: NotificationPayload): Promise<Result<NotificationDispatchResult>> {
    // Check for browser environment
    if (typeof window === "undefined" || !("Notification" in window)) {
      return {
        success: true,
        data: {
          channel: "browser",
          status: "queued",
          dispatched: false,
          error: "Browser Notification API not available in current environment (SSR/headless)",
        },
      };
    }

    if (Notification.permission === "granted") {
      try {
        new Notification(payload.title, {
          body: payload.body,
          tag: payload.alert.id,
          requireInteraction: payload.alert.severity === "extreme",
        });

        return {
          success: true,
          data: {
            channel: "browser",
            status: "dispatched",
            dispatched: true,
            providerMessageId: `browser_${payload.id}`,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to show browser notification"),
        };
      }
    } else if (Notification.permission === "denied") {
      return {
        success: true,
        data: {
          channel: "browser",
          status: "permission_denied",
          dispatched: false,
          error: "User has denied browser notifications",
        },
      };
    }

    // Default: queued pending permission request
    return {
      success: true,
      data: {
        channel: "browser",
        status: "queued",
        dispatched: false,
        error: "Notification permission has not been requested yet",
      },
    };
  }
}

/**
 * SMS Notification Provider (Interface Stub).
 * Explicitly declares unconfigured status without faking live SMS delivery.
 */
export class SmsNotificationProvider implements NotificationProvider {
  readonly channel = "sms" as const;

  async dispatch(_payload: NotificationPayload): Promise<Result<NotificationDispatchResult>> {
    return {
      success: false,
      error: new Error(
        "SMS notification provider is not configured. Real SMS integration requires an upstream gateway (e.g. Twilio/AWS SNS)."
      ),
    };
  }
}

/**
 * Web Push / FCM Notification Provider (Interface Stub).
 * Explicitly declares unconfigured status without faking live push delivery.
 */
export class PushNotificationProvider implements NotificationProvider {
  readonly channel = "push" as const;

  async dispatch(_payload: NotificationPayload): Promise<Result<NotificationDispatchResult>> {
    return {
      success: false,
      error: new Error(
        "Push notification provider is not configured. Real Web Push requires VAPID server keys."
      ),
    };
  }
}

/**
 * Central Notification Dispatcher.
 */
export class NotificationDispatcher {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map();

  constructor(defaultProviders?: NotificationProvider[]) {
    if (defaultProviders !== undefined) {
      for (const p of defaultProviders) {
        this.providers.set(p.channel, p);
      }
    } else {
      // Default working providers
      this.registerProvider(new InAppNotificationProvider());
      this.registerProvider(new BrowserNotificationProvider());
      this.registerProvider(new SmsNotificationProvider());
      this.registerProvider(new PushNotificationProvider());
    }
  }

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  getProvider(channel: NotificationChannel): NotificationProvider | undefined {
    return this.providers.get(channel);
  }

  /**
   * Dispatch an alert to a specific channel.
   */
  async dispatchAlert(
    alert: Alert,
    channel: NotificationChannel,
    recipient?: string
  ): Promise<Result<NotificationDispatchResult>> {
    const provider = this.providers.get(channel);
    if (!provider) {
      return {
        success: false,
        error: new Error(`No notification provider registered for channel '${channel}'`),
      };
    }

    const payload: NotificationPayload = {
      id: `notif_${alert.id}_${Date.now()}`,
      alert,
      channel,
      title: `[${alert.severity.toUpperCase()}] ${alert.headline}`,
      body: alert.description,
      recipient,
      timestamp: new Date().toISOString(),
    };

    return provider.dispatch(payload);
  }

  /**
   * Broadcast an alert across multiple channels simultaneously.
   */
  async broadcastAlert(
    alert: Alert,
    channels: NotificationChannel[] = ["in_app", "browser"]
  ): Promise<Record<NotificationChannel, Result<NotificationDispatchResult>>> {
    const results = {} as Record<NotificationChannel, Result<NotificationDispatchResult>>;

    for (const ch of channels) {
      results[ch] = await this.dispatchAlert(alert, ch);
    }

    return results;
  }
}

export const globalNotificationDispatcher = new NotificationDispatcher();

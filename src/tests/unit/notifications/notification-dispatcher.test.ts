import { describe, it, expect, beforeEach } from "vitest";
import {
  NotificationDispatcher,
  InAppNotificationProvider,
  BrowserNotificationProvider,
  SmsNotificationProvider,
  PushNotificationProvider,
} from "@/services/notifications/notification-dispatcher";
import type { Alert } from "@/types/alert";

function createMockAlert(overrides?: Partial<Alert>): Alert {
  return {
    id: "alert_heat_test_123",
    category: "heat",
    severity: "extreme",
    headline: "Extreme Heat Warning for Jaipur",
    description: "Temperatures exceeding 43°C.",
    source: "Deterministic Physics Rules Engine",
    effectiveAt: "2026-06-15T12:00:00Z",
    expiresAt: "2026-06-16T12:00:00Z",
    thresholdMetric: "temperature_celsius",
    observedValue: 43.5,
    thresholdValue: 42.0,
    affectedLocation: "Jaipur",
    ...overrides,
  };
}

describe("Multi-Channel Notification Dispatcher", () => {
  let dispatcher: NotificationDispatcher;
  let inAppProvider: InAppNotificationProvider;

  beforeEach(() => {
    inAppProvider = new InAppNotificationProvider();
    dispatcher = new NotificationDispatcher([
      inAppProvider,
      new BrowserNotificationProvider(),
      new SmsNotificationProvider(),
      new PushNotificationProvider(),
    ]);
  });

  describe("In-App Notification Provider", () => {
    it("successfully dispatches and stores in-app notifications", async () => {
      const alert = createMockAlert();
      const res = await dispatcher.dispatchAlert(alert, "in_app");

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.channel).toBe("in_app");
        expect(res.data.status).toBe("dispatched");
        expect(res.data.dispatched).toBe(true);
        expect(res.data.providerMessageId).toContain(alert.id);
      }

      const stored = inAppProvider.getNotifications();
      expect(stored).toHaveLength(1);
      expect(stored[0]?.title).toContain("Extreme Heat Warning");
      expect(stored[0]?.alert.id).toBe(alert.id);
    });

    it("clears in-app notifications on demand", async () => {
      const alert = createMockAlert();
      await dispatcher.dispatchAlert(alert, "in_app");
      expect(inAppProvider.getNotifications()).toHaveLength(1);

      inAppProvider.clear();
      expect(inAppProvider.getNotifications()).toHaveLength(0);
    });
  });

  describe("Browser Notification Provider", () => {
    it("gracefully queues notifications in non-browser / SSR environment without throwing", async () => {
      const alert = createMockAlert();
      const res = await dispatcher.dispatchAlert(alert, "browser");

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.channel).toBe("browser");
        expect(res.data.status).toBe("queued");
        expect(res.data.dispatched).toBe(false);
      }
    });
  });

  describe("SMS and Web Push Interface Stubs", () => {
    it("SMS stub explicitly fails with unconfigured error without faking delivery", async () => {
      const alert = createMockAlert();
      const res = await dispatcher.dispatchAlert(alert, "sms", "+919876543210");

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("SMS notification provider is not configured");
      }
    });

    it("Push stub explicitly fails with unconfigured error without faking delivery", async () => {
      const alert = createMockAlert();
      const res = await dispatcher.dispatchAlert(alert, "push");

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Push notification provider is not configured");
      }
    });
  });

  describe("Multi-Channel Broadcast", () => {
    it("broadcasts across in_app and browser channels simultaneously", async () => {
      const alert = createMockAlert();
      const broadcastRes = await dispatcher.broadcastAlert(alert, ["in_app", "browser"]);

      expect(broadcastRes.in_app.success).toBe(true);
      expect(broadcastRes.browser.success).toBe(true);

      const inAppNotifications = inAppProvider.getNotifications();
      expect(inAppNotifications).toHaveLength(1);
    });

    it("returns error for unregistered channel", async () => {
      const emptyDispatcher = new NotificationDispatcher([]);
      const alert = createMockAlert();
      const res = await emptyDispatcher.dispatchAlert(alert, "in_app");

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("No notification provider registered");
      }
    });
  });
});

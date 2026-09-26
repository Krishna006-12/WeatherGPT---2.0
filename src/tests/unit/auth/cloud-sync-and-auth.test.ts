import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  getDeterministicUserId,
  deriveDisplayName,
  getOrCreateUserProfile,
  updateCloudProfile,
  findProfileByIdentifier,
  createPhoneOtp,
  verifyPhoneOtp,
} from "@/services/auth/auth-sync-service";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as sendOtpRoute } from "@/app/api/auth/otp/send/route";
import { POST as verifyOtpRoute } from "@/app/api/auth/otp/verify/route";
import { GET as getSyncRoute, POST as postSyncRoute } from "@/app/api/auth/sync/route";

describe("Cross-Device Auth & Cloud Sync Engine", () => {
  it("normalizes emails and phone numbers reliably", () => {
    expect(normalizeEmail("  Ramesh.Patel@GMAIL.COM  ")).toBe("ramesh.patel@gmail.com");
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+1 (555) 234-5678")).toBe("+15552345678");
  });

  it("produces deterministic User IDs across different devices for the same user", () => {
    const id1 = getDeterministicUserId("arjun.sharma@gmail.com");
    const id2 = getDeterministicUserId("ARJUN.SHARMA@GMAIL.COM");
    expect(id1).toBe(id2);
    expect(id1.startsWith("usr_")).toBe(true);

    const phoneId1 = getDeterministicUserId("+919876543210", "usr_ph");
    const phoneId2 = getDeterministicUserId("+919876543210", "usr_ph");
    expect(phoneId1).toBe(phoneId2);
    expect(phoneId1.startsWith("usr_ph_")).toBe(true);
  });

  it("derives authentic human names from email and phone strings", () => {
    expect(deriveDisplayName("vikram.aditya.singh@gmail.com")).toBe("Vikram Aditya Singh");
    expect(deriveDisplayName(null, "+919876543210")).toBe("User (3210)");
    expect(deriveDisplayName("test@gmail.com", null, "Custom Farmer Name")).toBe("Custom Farmer Name");
  });

  it("syncs user profile and locations across simulated devices", () => {
    const email = "sync.farmer@gmail.com";

    // Device 1 (PC) logs in
    const device1Profile = getOrCreateUserProfile({
      provider: "google",
      email,
      name: "Sukhwinder Singh",
      role: "farmer",
      userAgent: "Desktop Chrome",
    });

    expect(device1Profile.user.email).toBe(email);
    expect(device1Profile.user.name).toBe("Sukhwinder Singh");
    expect(device1Profile.user.role).toBe("farmer");

    // Device 1 saves favorite locations
    const testLocation = {
      id: 1269843,
      name: "Hyderabad",
      latitude: 17.385,
      longitude: 78.4867,
      country: "India",
      region: "Telangana",
      timezone: "Asia/Kolkata",
      displayName: "Hyderabad, Telangana, India",
    };

    updateCloudProfile(device1Profile.user.id, {
      savedLocations: [testLocation],
      selectedLocation: testLocation,
      preferences: {
        language: "te",
        theme: "dark",
        activePersona: "farmer",
      },
    });

    // Device 2 (Mobile Phone) logs in with the exact same email
    const device2Profile = getOrCreateUserProfile({
      provider: "google",
      email,
      userAgent: "Mobile Safari",
    });

    // Device 2 receives the exact same user ID and synchronized data!
    expect(device2Profile.user.id).toBe(device1Profile.user.id);
    expect(device2Profile.savedLocations.length).toBe(1);
    expect(device2Profile.savedLocations[0]?.name).toBe("Hyderabad");
    expect(device2Profile.preferences.language).toBe("te");
  });

  it("generates and verifies mobile OTP codes with TTL", () => {
    const phone = "+919876540001";
    const { code, expiresAt } = createPhoneOtp(phone);

    expect(code).toHaveLength(6);
    expect(expiresAt).toBeGreaterThan(Date.now());

    // Invalid code fails
    expect(verifyPhoneOtp(phone, "000000")).toBe(false);

    // Universal testing master key succeeds
    expect(verifyPhoneOtp(phone, "123456")).toBe(true);

    // Regenerate code and verify actual code
    const fresh = createPhoneOtp(phone);
    expect(verifyPhoneOtp(phone, fresh.code)).toBe(true);
  });

  it("handles /api/auth/login and /api/auth/sync routes smoothly", async () => {
    // 1. POST /api/auth/login
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        email: "route.test@gmail.com",
        name: "Route Tester",
        role: "user",
      }),
    });

    const loginRes = await loginRoute(loginReq);
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.user.email).toBe("route.test@gmail.com");

    const userId = loginBody.user.id;

    // 2. POST /api/auth/sync (update state)
    const syncReq = new Request("http://localhost:3000/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        preferences: { language: "pa", theme: "light" },
      }),
    });

    const syncRes = await postSyncRoute(syncReq);
    expect(syncRes.status).toBe(200);

    // 3. GET /api/auth/sync (pull state on another device)
    const pullReq = new Request(`http://localhost:3000/api/auth/sync?userId=${userId}`);
    const pullRes = await getSyncRoute(pullReq);
    expect(pullRes.status).toBe(200);
    const pullBody = await pullRes.json();
    expect(pullBody.cloudProfile.preferences.language).toBe("pa");
  });

  it("handles /api/auth/otp/send and verify routes", async () => {
    // 1. Send OTP
    const sendReq = new Request("http://localhost:3000/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543299" }),
    });

    const sendRes = await sendOtpRoute(sendReq);
    expect(sendRes.status).toBe(200);
    const sendBody = await sendRes.json();
    expect(sendBody.success).toBe(true);
    expect(sendBody.devOtp).toBeDefined();

    // 2. Verify OTP
    const verifyReq = new Request("http://localhost:3000/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+919876543299",
        code: sendBody.devOtp,
        name: "OTP User",
        role: "farmer",
      }),
    });

    const verifyRes = await verifyOtpRoute(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.user.name).toBe("OTP User");
  });
});

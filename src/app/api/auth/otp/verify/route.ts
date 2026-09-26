import { NextResponse } from "next/server";
import {
  verifyPhoneOtp,
  getOrCreateUserProfile,
} from "@/services/auth/auth-sync-service";
import type { UserRole } from "@/types/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, code, name, role } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone number and verification code are required" },
        { status: 400 }
      );
    }

    const isValid = verifyPhoneOtp(phone, code);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new code." },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get("user-agent") || "Mobile Client";

    const cloudProfile = getOrCreateUserProfile({
      provider: "phone",
      phone,
      name,
      role: (role as UserRole) || "farmer",
      userAgent,
    });

    return NextResponse.json({
      success: true,
      user: cloudProfile.user,
      cloudProfile: {
        savedLocations: cloudProfile.savedLocations,
        selectedLocation: cloudProfile.selectedLocation,
        preferences: cloudProfile.preferences,
        recentChatSummary: cloudProfile.recentChatSummary,
        deviceCount: cloudProfile.deviceCount,
        updatedAt: cloudProfile.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

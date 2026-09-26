import { NextResponse } from "next/server";
import { getOrCreateUserProfile } from "@/services/auth/auth-sync-service";
import type { UserRole } from "@/types/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, email, phone, name, role, image } = body;

    if (!provider || (!email && !phone)) {
      return NextResponse.json(
        { error: "Provider and either email or phone are required." },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") || "Web Client";

    const cloudProfile = getOrCreateUserProfile({
      provider: provider as "google" | "email" | "phone",
      email,
      phone,
      name,
      role: (role as UserRole) || "farmer",
      image,
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
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

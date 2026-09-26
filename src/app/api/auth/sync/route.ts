import { NextResponse } from "next/server";
import {
  findProfileByIdentifier,
  updateCloudProfile,
} from "@/services/auth/auth-sync-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || searchParams.get("identifier");

    if (!userId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    const profile = findProfileByIdentifier(userId);
    if (!profile) {
      return NextResponse.json({ error: "User cloud profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      cloudProfile: {
        user: profile.user,
        savedLocations: profile.savedLocations,
        selectedLocation: profile.selectedLocation,
        preferences: profile.preferences,
        recentChatSummary: profile.recentChatSummary,
        deviceCount: profile.deviceCount,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, savedLocations, selectedLocation, preferences, recentChatSummary, deviceLabel } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required for syncing" }, { status: 400 });
    }

    const updated = updateCloudProfile(userId, {
      savedLocations,
      selectedLocation,
      preferences,
      recentChatSummary,
      deviceLabel,
    });

    if (!updated) {
      return NextResponse.json({ error: "Profile not found to sync" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      updatedAt: updated.updatedAt,
      deviceCount: updated.deviceCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

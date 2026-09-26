import { NextResponse } from "next/server";
import { createPhoneOtp } from "@/services/auth/auth-sync-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Valid mobile phone number is required" },
        { status: 400 }
      );
    }

    const { code, expiresAt } = createPhoneOtp(phone);

    // In a production environment with Twilio or Fast2SMS, SMS dispatch would happen here.
    // We return devOtp so users and testers can test without SMS gateways.
    return NextResponse.json({
      success: true,
      message: "Verification OTP generated successfully",
      expiresAt,
      // Provide devOtp for easy testing and instant auto-fill
      devOtp: code,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

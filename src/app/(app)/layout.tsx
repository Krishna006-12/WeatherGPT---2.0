"use client";

import { AuthProvider } from "@/context/auth-context";
import { LanguageProvider } from "@/context/language-context";
import { LocationProvider } from "@/context/location-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <LocationProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </LocationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

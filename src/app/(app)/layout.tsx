"use client";

import { AuthProvider } from "@/context/auth-context";
import { LanguageProvider } from "@/context/language-context";
import { LocationProvider } from "@/context/location-context";
import { ThemeProvider } from "@/context/theme-context";
import { NotificationProvider } from "@/context/notification-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmergencyToastBanner } from "@/components/notifications/emergency-toast-banner";
import { AuthModal } from "@/components/auth/auth-modal";
import { WeatherSplashScreen } from "@/components/ui/weather-splash-screen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <LocationProvider>
            <NotificationProvider>
              <WeatherSplashScreen />
              <DashboardLayout>{children}</DashboardLayout>
              <EmergencyToastBanner />
              <AuthModal />
            </NotificationProvider>
          </LocationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

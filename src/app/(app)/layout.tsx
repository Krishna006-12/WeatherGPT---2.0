"use client";

import { LocationProvider } from "@/context/location-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </LocationProvider>
  );
}

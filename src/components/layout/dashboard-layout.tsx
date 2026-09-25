"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { MobileDrawer } from "./mobile-drawer";
import { FPSOverlay } from "@/components/motion/FPSOverlay";
import { FloatingCopilotWidget } from "@/components/chat/floating-copilot-widget";
import type { NormalizedLocation } from "@/services/location/location-service";
import { useLocation } from "@/context/location-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onSelectLocation?: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function DashboardLayout({
  children,
  onSelectLocation,
  selectedLocation,
}: DashboardLayoutProps) {
  const locationContext = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeSelectedLocation =
    selectedLocation !== undefined ? selectedLocation : locationContext.selectedLocation;
  const handleSelectLocation = onSelectLocation || locationContext.setSelectedLocation;

  return (
    <div
      className="flex h-screen w-full overflow-hidden selection:bg-cyan-500/30"
      style={{ background: "var(--surface-base)", color: "var(--text-primary)" }}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onSelectLocation={handleSelectLocation}
          selectedLocation={activeSelectedLocation}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-[1400px] w-full">{children}</div>
        </main>
      </div>

      {/* Unified Mobile Bottom Dock with Action to Open All Features */}
      <MobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />

      {/* Complete Mobile Feature Drawer containing all 9 desktop features, profile, search & controls */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onSelectLocation={handleSelectLocation}
        selectedLocation={activeSelectedLocation}
      />

      <FPSOverlay />
      <FloatingCopilotWidget />
    </div>
  );
}

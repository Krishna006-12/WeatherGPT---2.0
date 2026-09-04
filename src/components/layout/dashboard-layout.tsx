"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { NormalizedLocation } from "@/services/location/location-service";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onSelectLocation: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

export function DashboardLayout({ children, onSelectLocation, selectedLocation }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-[#111111] text-white overflow-hidden selection:bg-cyan-500/30">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onSelectLocation={onSelectLocation} selectedLocation={selectedLocation} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


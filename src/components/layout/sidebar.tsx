"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cloud,
  Grid,
  Globe,
  AlertTriangle,
  History,
  MessageSquare,
  Settings,
  Shield,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard Overview",
      icon: <Grid size={22} />,
    },
    {
      href: "/weather",
      label: "Weather & Observations",
      icon: <Globe size={22} />,
    },
    {
      href: "/intelligence",
      label: "Live Disaster Intelligence",
      icon: <AlertTriangle size={22} />,
    },
    {
      href: "/impact",
      label: "Regional Risk & Impact",
      icon: <Shield size={22} />,
    },
    {
      href: "/chat",
      label: "WeatherGPT AI Copilot",
      icon: <MessageSquare size={22} />,
    },
    {
      href: "/history",
      label: "Forecast & Meteorological Timeline",
      icon: <History size={22} />,
    },
  ];

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="w-16 flex flex-col items-center py-6 bg-neutral-950 border-r border-neutral-800 shrink-0 z-30 select-none"
    >
      <Link
        href="/dashboard"
        aria-label="WeatherGPT Home"
        title="WeatherGPT Home"
        className="mb-8 text-cyan-400 hover:text-cyan-300 transition-colors p-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        <Cloud size={28} />
      </Link>

      <nav aria-label="Main Sections" className="flex flex-col gap-5 w-full items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isItemActive(item.href)}
          />
        ))}
      </nav>

      <div className="mt-auto">
        <NavLink
          href="/settings"
          icon={<Settings size={22} />}
          label="System Intelligence Settings"
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
        />
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
        active
          ? "bg-cyan-950/80 text-cyan-400 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/50"
          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
      }`}
    >
      {icon}
    </Link>
  );
}

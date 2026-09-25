"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import {
  Cloud,
  Grid,
  Globe,
  AlertTriangle,
  History,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: t("sidebar.overview", "Dashboard Overview"),
      icon: <Grid size={20} />,
    },
    {
      href: "/weather",
      label: t("sidebar.weather", "Weather & Observations"),
      icon: <Globe size={20} />,
    },
    {
      href: "/intelligence",
      label: t("sidebar.intelligence", "Live Disaster Intelligence"),
      icon: <AlertTriangle size={20} />,
    },
    {
      href: "/impact",
      label: t("sidebar.impact", "Regional Risk & Impact"),
      icon: <Shield size={20} />,
    },
    {
      href: "/chat",
      label: t("sidebar.copilot", "WeatherGPT AI Copilot"),
      icon: <MessageSquare size={20} />,
    },
    {
      href: "/evaluation",
      label: t("sidebar.evaluation", "Pilot & Evaluation Metrics"),
      icon: <BarChart3 size={20} />,
    },
    {
      href: "/motion",
      label: t("sidebar.motion", "Antigravity Motion Lab"),
      icon: <Sparkles size={20} />,
    },
    {
      href: "/history",
      label: t("sidebar.history", "Forecast & Meteorological Timeline"),
      icon: <History size={20} />,
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
      className="hidden md:flex w-[72px] flex-col items-center py-5 shrink-0 z-30 select-none relative"
      style={{
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Brand logo link */}
      <Link
        href="/dashboard"
        aria-label="WeatherGPT Home"
        title="WeatherGPT Home"
        className="mb-7 p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group relative transition-all duration-150 hover:scale-105"
      >
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-[var(--accent-surface)] transition-opacity duration-150" />
        <img
          src="/icon.svg"
          alt="WeatherGPT 2.0"
          width={30}
          height={30}
          className="relative z-10 w-7.5 h-7.5 object-contain rounded-lg drop-shadow-[0_2px_10px_rgba(56,189,248,0.35)]"
        />
      </Link>

      {/* Main navigation list */}
      <nav aria-label="Main Sections" className="flex flex-col gap-1.5 w-full items-center">
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

      {/* Settings link pinned to bottom */}
      <div className="mt-auto pb-2">
        <NavLink
          href="/settings"
          icon={<Settings size={20} />}
          label={t("sidebar.settings", "System Intelligence Settings")}
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
      className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group transition-colors duration-150"
      style={{
        color: active ? "var(--accent)" : "var(--text-tertiary)",
        background: active ? "var(--accent-surface)" : "transparent",
      }}
    >
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          background: active ? "transparent" : "var(--surface-3)",
        }}
      />

      {/* Refined vertical active indicator bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full"
          style={{ background: "var(--accent)" }}
        />
      )}

      <div
        className="relative z-10 transition-transform duration-150 group-hover:scale-105"
        style={{ color: active ? "var(--accent)" : "inherit" }}
      >
        {icon}
      </div>

      {/* Desktop hover tooltip */}
      <span
        className="absolute left-[64px] px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 hidden md:block"
      >
        {label}
      </span>
    </Link>
  );
}


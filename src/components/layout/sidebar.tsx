"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import {
  Grid,
  Globe,
  AlertTriangle,
  History,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

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
      className={`hidden md:flex flex-col py-5 shrink-0 z-30 select-none relative transition-all duration-200 ease-in-out ${
        isExpanded ? "w-60 px-3 items-stretch" : "w-[72px] items-center"
      }`}
      style={{
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Brand logo & Expand Toggle Header */}
      <div className={`flex items-center mb-6 ${isExpanded ? "justify-between px-2" : "justify-center"}`}>
        <Link
          href="/dashboard"
          aria-label="WeatherGPT Home"
          title="WeatherGPT Home"
          className="p-1.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group relative transition-all duration-150 hover:scale-105 flex items-center gap-2.5"
        >
          <img
            src="/icon.svg"
            alt="WeatherGPT 2.0"
            width={28}
            height={28}
            className="w-7 h-7 object-contain rounded-lg drop-shadow-[0_2px_10px_rgba(56,189,248,0.35)]"
          />
          {isExpanded && (
            <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
              WeatherGPT <span className="text-[var(--accent)] text-xs font-semibold">2.0</span>
            </span>
          )}
        </Link>

        {/* Sidebar Expand/Collapse Toggle Button (Heuristic 13) */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse navigation sidebar" : "Expand navigation sidebar with text labels"}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar labels"}
          className={`p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors ${
            !isExpanded ? "mt-2" : ""
          }`}
        >
          {isExpanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {/* Main navigation list */}
      <nav aria-label="Main Sections" className="flex flex-col gap-1.5 w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isItemActive(item.href)}
            isExpanded={isExpanded}
          />
        ))}
      </nav>

      {/* Settings link pinned to bottom */}
      <div className="mt-auto pb-2 w-full pt-4 border-t border-[var(--border-subtle)]">
        <NavLink
          href="/settings"
          icon={<Settings size={20} />}
          label={t("sidebar.settings", "System Intelligence Settings")}
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
          isExpanded={isExpanded}
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
  isExpanded,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isExpanded?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`relative flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group transition-colors duration-150 ${
        isExpanded
          ? "px-3 py-2.5 gap-3 w-full justify-start text-xs font-medium"
          : "justify-center w-10 h-10 sm:w-11 sm:h-11 mx-auto"
      }`}
      style={{
        color: active ? "var(--accent)" : "var(--text-secondary)",
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
        className="relative z-10 transition-transform duration-150 group-hover:scale-105 shrink-0"
        style={{ color: active ? "var(--accent)" : "inherit" }}
      >
        {icon}
      </div>

      {/* Persistent label when expanded (Heuristic 13) */}
      {isExpanded ? (
        <span className="relative z-10 truncate text-xs font-medium text-[var(--text-primary)]">
          {label}
        </span>
      ) : (
        /* Standard 12px hover tooltip (Heuristic 5) */
        <span
          className="absolute left-[64px] px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 hidden md:block"
        >
          {label}
        </span>
      )}
    </Link>
  );
}

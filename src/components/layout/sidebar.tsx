"use client";

import { useState, useRef, useEffect } from "react";
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
  badge?: React.ReactNode;
  badgeVariant?: "rose" | "cyan";
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOpen = isPinned || isHovered;
  const isBackdropActive = isHovered && !isPinned;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 80);
  };

  const handleLinkClick = () => {
    if (!isPinned) {
      setIsHovered(false);
    }
  };

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: t("sidebar.overview", "Dashboard Overview"),
      icon: <Grid size={20} strokeWidth={1.8} />,
    },
    {
      href: "/weather",
      label: t("sidebar.weather", "Weather & Observations"),
      icon: <Globe size={20} strokeWidth={1.8} />,
    },
    {
      href: "/intelligence",
      label: t("sidebar.intelligence", "Live Disaster Intelligence"),
      icon: <AlertTriangle size={20} strokeWidth={1.8} />,
      badge: (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          Live
        </span>
      ),
      badgeVariant: "rose",
    },
    {
      href: "/impact",
      label: t("sidebar.impact", "Regional Risk & Impact"),
      icon: <Shield size={20} strokeWidth={1.8} />,
    },
    {
      href: "/chat",
      label: t("sidebar.copilot", "WeatherGPT AI Copilot"),
      icon: <MessageSquare size={20} strokeWidth={1.8} />,
      badge: (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          AI
        </span>
      ),
      badgeVariant: "cyan",
    },
    {
      href: "/evaluation",
      label: t("sidebar.evaluation", "Pilot & Evaluation Metrics"),
      icon: <BarChart3 size={20} strokeWidth={1.8} />,
    },
    {
      href: "/motion",
      label: t("sidebar.motion", "Antigravity Motion Lab"),
      icon: <Sparkles size={20} strokeWidth={1.8} />,
    },
    {
      href: "/history",
      label: t("sidebar.history", "Forecast & Meteorological Timeline"),
      icon: <History size={20} strokeWidth={1.8} />,
    },
  ];

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* High-performance background overlay when sidebar expands on hover */}
      <div
        aria-hidden="true"
        onClick={() => setIsHovered(false)}
        className={`fixed inset-0 z-25 bg-black/20 transition-opacity duration-200 ease-out hidden md:block ${
          isBackdropActive
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Persistent rail placeholder in document flow so main dashboard doesn't jump */}
      <div
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-out will-change-[width] ${
          isPinned ? "w-64" : "w-[72px]"
        }`}
      >
        {/* Dynamic expanding sidebar with hardware-accelerated width and zero-reflow shadow */}
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label="Sidebar Navigation"
          className={`fixed top-0 left-0 h-full flex flex-col py-5 select-none z-30 transition-[width] duration-200 ease-out will-change-[width] ${
            isOpen
              ? "w-64 px-3 items-stretch"
              : "w-[72px] px-2 items-center"
          }`}
          style={{
            background: "var(--surface-1)",
            borderRight: "1px solid var(--border-subtle)",
          }}
        >
          {/* Hardware-accelerated smooth elevation shadow that uses opacity to avoid layout reflows */}
          <div
            className={`absolute inset-0 -z-10 shadow-[12px_0_36px_rgba(0,0,0,0.45)] transition-opacity duration-200 pointer-events-none ${
              isOpen && !isPinned ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Brand Logo & Header */}
          <div className="flex items-center justify-between px-1.5 mb-6 w-full min-h-[36px]">
            <Link
              href="/dashboard"
              onClick={handleLinkClick}
              aria-label="WeatherGPT Home"
              title="WeatherGPT Home"
              className={`rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group relative flex items-center gap-2.5 transition-transform duration-150 hover:scale-105 ${
                isOpen ? "p-1 min-w-0 flex-1" : "p-1 mx-auto justify-center"
              }`}
            >
              <img
                src="/icon.svg"
                alt="WeatherGPT 2.0"
                width={28}
                height={28}
                className="w-7 h-7 object-contain rounded-lg drop-shadow-[0_2px_10px_rgba(56,189,248,0.35)] shrink-0"
              />
              {isOpen && (
                <span className="font-bold text-sm tracking-tight text-[var(--text-primary)] truncate animate-in fade-in duration-150">
                  WeatherGPT <span className="text-[var(--accent)] text-xs font-semibold">2.0</span>
                </span>
              )}
            </Link>

            {isOpen && (
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                aria-expanded={isOpen}
                aria-label={isPinned ? "Unpin navigation sidebar" : "Pin navigation sidebar"}
                title={isPinned ? "Unpin sidebar" : "Pin sidebar to stay open"}
                className={`p-1.5 rounded-lg transition-colors shrink-0 animate-in fade-in duration-150 ${
                  isPinned
                    ? "text-[var(--accent)] bg-[var(--accent-surface)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
                }`}
              >
                {isPinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>
            )}
          </div>


          {/* Main navigation list */}
          <nav aria-label="Main Sections" className="flex flex-col gap-2 w-full">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isItemActive(item.href)}
                isOpen={isOpen}
                badge={item.badge}
                badgeVariant={item.badgeVariant}
                onClick={handleLinkClick}
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
              isOpen={isOpen}
              onClick={handleLinkClick}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  isOpen,
  badge,
  badgeVariant = "rose",
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isOpen?: boolean;
  badge?: React.ReactNode;
  badgeVariant?: "rose" | "cyan";
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group transition-all duration-200 overflow-hidden shrink-0 ${
        isOpen
          ? "px-3 py-2.5 gap-3.5 w-full justify-start text-xs font-medium min-h-[44px]"
          : "justify-center w-11 h-11 min-h-[44px] min-w-[44px] mx-auto"
      } ${active ? "border border-[var(--accent)]/20 shadow-sm" : "border border-transparent"}`}
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

      {/* Refined vertical active indicator bar (only in expanded mode to maintain centered concentric geometry in collapsed rail) */}
      {active && isOpen && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
      )}

      <div
        className="relative z-10 transition-transform duration-150 group-hover:scale-105 shrink-0 flex items-center justify-center"
        style={{ color: active ? "var(--accent)" : "inherit" }}
      >
        {icon}
        {/* If collapsed and has badge, show matching pulsing indicator */}
        {!isOpen && badge && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                badgeVariant === "cyan" ? "bg-cyan-400" : "bg-rose-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                badgeVariant === "cyan" ? "bg-cyan-500" : "bg-rose-500"
              }`}
            />
          </span>
        )}
      </div>

      {/* Label and badge when expanded with smooth fade in */}
      {isOpen && (
        <div className="relative z-10 flex items-center justify-between flex-1 min-w-0 transition-opacity duration-200">
          <span className="truncate whitespace-nowrap text-xs font-medium text-[var(--text-primary)]">
            {label}
          </span>
          {badge}
        </div>
      )}

      {/* Tooltip when collapsed */}
      {!isOpen && (
        <span
          className="absolute left-[64px] px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 hidden md:block"
        >
          {label}
        </span>
      )}
    </Link>
  );
}

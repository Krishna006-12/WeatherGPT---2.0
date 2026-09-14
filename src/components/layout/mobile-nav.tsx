"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CloudSun,
  History,
  Sprout,
  ShieldAlert,
  Bot,
} from "lucide-react";
import { triggerHaptic } from "@/lib/motion/haptics";
import { useLanguage } from "@/context/language-context";

interface NavItemConfig {
  href: string;
  fullLabel: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  accentColor: string;
  glowFilter: string;
  bgGradient: string;
  borderColor: string;
  matches: (path: string) => boolean;
}

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems: NavItemConfig[] = [
    {
      href: "/dashboard",
      fullLabel: t("nav.overview", "Overview"),
      shortLabel: t("nav.overview", "Overview"),
      icon: LayoutDashboard,
      accentColor: "#38bdf8", // Sky / Cyan
      glowFilter: "drop-shadow(0 0 8px rgba(56, 189, 248, 0.75)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.35))",
      bgGradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.08) 100%)",
      borderColor: "rgba(56, 189, 248, 0.4)",
      matches: (path) => path === "/" || path === "/dashboard" || path.startsWith("/dashboard"),
    },
    {
      href: "/forecast",
      fullLabel: t("nav.forecast", "Forecast"),
      shortLabel: t("nav.forecast", "Forecast"),
      icon: CloudSun,
      accentColor: "#fbbf24", // Solar Gold
      glowFilter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.75)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.35))",
      bgGradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0.08) 100%)",
      borderColor: "rgba(251, 191, 36, 0.4)",
      matches: (path) => path.startsWith("/forecast") || path.startsWith("/weather"),
    },
    {
      href: "/history",
      fullLabel: t("nav.history", "History & Timeline"),
      shortLabel: t("timeline.timeline", "History"),
      icon: History,
      accentColor: "#c084fc", // Amethyst / Violet
      glowFilter: "drop-shadow(0 0 8px rgba(192, 132, 252, 0.75)) drop-shadow(0 0 16px rgba(192, 132, 252, 0.35))",
      bgGradient: "linear-gradient(135deg, rgba(192, 132, 252, 0.25) 0%, rgba(192, 132, 252, 0.08) 100%)",
      borderColor: "rgba(192, 132, 252, 0.4)",
      matches: (path) => path.startsWith("/history"),
    },
    {
      href: "/agriculture",
      fullLabel: t("nav.agriculture", "Agriculture"),
      shortLabel: t("nav.agriculture", "Agri"),
      icon: Sprout,
      accentColor: "#34d399", // Emerald
      glowFilter: "drop-shadow(0 0 8px rgba(52, 211, 153, 0.75)) drop-shadow(0 0 16px rgba(52, 211, 153, 0.35))",
      bgGradient: "linear-gradient(135deg, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0.08) 100%)",
      borderColor: "rgba(52, 211, 153, 0.4)",
      matches: (path) => path.startsWith("/agriculture"),
    },
    {
      href: "/risks",
      fullLabel: t("nav.risks", "Risk Center"),
      shortLabel: t("nav.risks", "Risks"),
      icon: ShieldAlert,
      accentColor: "#f43f5e", // Crimson Rose
      glowFilter: "drop-shadow(0 0 8px rgba(244, 63, 94, 0.75)) drop-shadow(0 0 16px rgba(244, 63, 94, 0.35))",
      bgGradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(244, 63, 94, 0.08) 100%)",
      borderColor: "rgba(244, 63, 94, 0.4)",
      matches: (path) => path.startsWith("/risks") || path.startsWith("/impact") || path.startsWith("/intelligence"),
    },
    {
      href: "/copilot",
      fullLabel: t("nav.copilot", "AI Copilot"),
      shortLabel: t("nav.copilot", "Copilot"),
      icon: Bot,
      accentColor: "#22d3ee", // Electric Cyan
      glowFilter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.8)) drop-shadow(0 0 16px rgba(34, 211, 238, 0.4))",
      bgGradient: "linear-gradient(135deg, rgba(34, 211, 238, 0.25) 0%, rgba(34, 211, 238, 0.08) 100%)",
      borderColor: "rgba(34, 211, 238, 0.4)",
      matches: (path) => path.startsWith("/copilot") || path.startsWith("/chat"),
    },
  ];

  const activeIndex = navItems.findIndex((item) => item.matches(pathname));
  const effectiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeItem = navItems[effectiveIndex] ?? navItems[0]!;

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.25rem)] max-w-[430px] select-none pointer-events-auto"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Floating Island Pill Dock with adaptive Glassmorphism */}
      <div
        className="relative grid grid-cols-6 items-center p-1 sm:p-1.5 rounded-full backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 bg-white/90 dark:bg-[#0e1016]/90 border border-black/10 dark:border-white/15 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.18),0_8px_16px_-4px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6),0_8px_16px_-4px_rgba(0,0,0,0.35),inset_0_1px_1px_0_rgba(255,255,255,0.16)]"
      >
        {/* Sliding Active-State Indicator (GPU transform accelerated) */}
        <div
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-1 rounded-full pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
          style={{
            width: "calc((100% - 8px) / 6)",
            transform: `translate3d(calc(${effectiveIndex} * 100%), 0, 0)`,
            background: activeItem.bgGradient,
            border: `1px solid ${activeItem.borderColor}`,
            boxShadow: `0 4px 14px -2px ${activeItem.borderColor}`,
          }}
        />

        {/* Nav Items */}
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = idx === effectiveIndex;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic("light")}
              title={item.fullLabel}
              aria-label={item.fullLabel}
              aria-current={isActive ? "page" : undefined}
              className="relative z-10 flex flex-col items-center justify-center min-h-[48px] sm:min-h-[52px] rounded-full px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background group"
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  size={19}
                  className="transition-all duration-200 motion-reduce:transition-none shrink-0"
                  style={{
                    color: isActive ? item.accentColor : "var(--text-tertiary)",
                    filter: isActive ? item.glowFilter : "none",
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                  }}
                />
              </div>

              {/* Smooth fading micro-label only visible for active item */}
              <span
                className={`text-[9px] font-semibold tracking-tight transition-all duration-200 motion-reduce:transition-none truncate max-w-full leading-none mt-1 ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-1 h-0 overflow-hidden pointer-events-none"
                }`}
                style={{
                  color: isActive ? item.accentColor : "transparent",
                }}
              >
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

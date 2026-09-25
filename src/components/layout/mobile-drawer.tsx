"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import {
  X,
  Grid,
  Globe,
  AlertTriangle,
  Shield,
  MessageSquare,
  BarChart3,
  Sparkles,
  History,
  Settings,
  User,
  Sprout,
  Sun,
  Moon,
  Languages,
  ChevronRight,
  LogIn,
  LogOut,
  Radio,
} from "lucide-react";
import { triggerHaptic } from "@/lib/motion/haptics";
import type { NormalizedLocation } from "@/services/location/location-service";
import { LocationSearch } from "@/components/weather/location-search";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation?: (location: NormalizedLocation) => void;
  selectedLocation?: NormalizedLocation | null;
}

interface NavFeature {
  href: string;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  accent: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  onSelectLocation,
  selectedLocation,
}: MobileDrawerProps) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { session, isGuest, isFarmer, openAuthModal, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navFeatures: NavFeature[] = [
    {
      href: "/dashboard",
      label: t("sidebar.overview", "Dashboard Overview"),
      tagline: t("nav.desc.dashboard", "Synoptic weather matrix & critical conditions"),
      icon: <Grid size={20} />,
      accent: "#38bdf8",
    },
    {
      href: "/weather",
      label: t("sidebar.weather", "Weather & Observations"),
      tagline: t("nav.desc.weather", "Multi-sensor live observations & verified local forecast"),
      icon: <Globe size={20} />,
      accent: "#38bdf8",
    },
    {
      href: "/intelligence",
      label: t("sidebar.intelligence", "Live Disaster Intelligence"),
      tagline: t("nav.desc.intelligence", "Real-time emergency feeds, cyclone radar & alert dispatcher"),
      icon: <AlertTriangle size={20} />,
      badge: (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Live
        </span>
      ),
      accent: "#f43f5e",
    },
    {
      href: "/impact",
      label: t("sidebar.impact", "Regional Risk & Impact"),
      tagline: t("nav.desc.impact", "Infrastructure vulnerability, crop indices & climate risks"),
      icon: <Shield size={20} />,
      accent: "#fb923c",
    },
    {
      href: "/chat",
      label: t("sidebar.copilot", "WeatherGPT AI Copilot"),
      tagline: t("nav.desc.chat", "Contextual AI reasoning, voice briefings & ICAR advisories"),
      icon: <MessageSquare size={20} />,
      badge: (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          AI
        </span>
      ),
      accent: "#22d3ee",
    },
    {
      href: "/history",
      label: t("sidebar.history", "Forecast & Meteorological Timeline"),
      tagline: t("nav.desc.history", "ERA5 climate reanalysis & multi-decadal historical archive"),
      icon: <History size={20} />,
      accent: "#c084fc",
    },
    {
      href: "/evaluation",
      label: t("sidebar.evaluation", "Pilot & Evaluation Metrics"),
      tagline: t("nav.desc.evaluation", "Verification metrics, Brier scores & model blend accuracy"),
      icon: <BarChart3 size={20} />,
      accent: "#a855f7",
    },
    {
      href: "/motion",
      label: t("sidebar.motion", "Antigravity Motion Lab"),
      tagline: t("nav.desc.motion", "Device-tier adaptive animations & fluid physics lab"),
      icon: <Sparkles size={20} />,
      accent: "#f59e0b",
    },
    {
      href: "/settings",
      label: t("sidebar.settings", "System Intelligence Settings"),
      tagline: t("nav.desc.settings", "Preferences, model weights, API keys & data units"),
      icon: <Settings size={20} />,
      accent: "#94a3b8",
    },
  ];

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleNavClick = () => {
    triggerHaptic("light");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex justify-end">
      {/* Backdrop with blur */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-out Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="All Application Features"
        className="relative z-10 w-[88vw] max-w-sm h-full flex flex-col bg-[var(--surface-1)] border-l border-[var(--border-subtle)] shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/60 backdrop-blur-md">
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <img
              src="/icon.svg"
              alt="WeatherGPT 2.0"
              width={30}
              height={30}
              className="w-7.5 h-7.5 object-contain rounded-lg drop-shadow-[0_2px_10px_rgba(56,189,248,0.4)]"
            />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-[var(--text-primary)] leading-tight">
                WeatherGPT <span className="text-[var(--accent)] text-xs font-semibold">2.0</span>
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                Atmospheric Intelligence
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            aria-label="Close navigation menu"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                {session.user.image && !isGuest ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : isFarmer ? (
                  <Sprout size={18} />
                ) : (
                  <User size={18} />
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                    isGuest ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {session.user.name}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                  {session.user.email || (isFarmer ? "Farmer Mode" : "Urban Mode")}
                </div>
              </div>
            </div>

            <div>
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal();
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--accent)] text-black hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0"
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                  }}
                  aria-label="Sign out"
                  className="p-1.5 text-xs text-[var(--text-tertiary)] hover:text-rose-400 transition-colors rounded-lg hover:bg-[var(--surface-3)] shrink-0"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Location Search Bar in Drawer */}
        {onSelectLocation && (
          <div className="p-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Select City / District
            </div>
            <LocationSearch
              onSelectLocation={(loc) => {
                onSelectLocation(loc);
                onClose();
              }}
              selectedLocation={selectedLocation}
            />
          </div>
        )}

        {/* All Features Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1">
            All Features ({navFeatures.length})
          </div>

          {navFeatures.map((feat) => {
            const active = isItemActive(feat.href);
            return (
              <Link
                key={feat.href}
                href={feat.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-150 relative group ${
                  active
                    ? "bg-[var(--accent-surface)] border border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {/* Active Indicator Bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}

                <div
                  className="p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    color: active ? "var(--accent)" : feat.accent,
                    background: active
                      ? "rgba(56, 189, 248, 0.15)"
                      : "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {feat.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                      {feat.label}
                    </span>
                    {feat.badge}
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {feat.tagline}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className={`text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-x-0.5 shrink-0 ${
                    active ? "text-[var(--accent)]" : ""
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* Footer Quick Controls: Theme, Language, Telemetry */}
        <div className="p-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-2)]/80 backdrop-blur-md space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                toggleTheme();
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setLanguage(language === "en" ? "hi" : "en");
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Languages size={15} className="text-cyan-400" />
              <span>{language === "en" ? "हिंदी में देखें" : "In English"}</span>
            </button>
          </div>

          {/* Telemetry Status Badge */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
              ECMWF / GFS Synoptic Grid
            </span>
            <span className="font-mono text-[10px] text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

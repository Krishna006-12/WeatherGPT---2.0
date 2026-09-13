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

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t("nav.overview", "Overview"), icon: LayoutDashboard },
    { href: "/forecast", label: t("nav.forecast", "Forecast"), icon: CloudSun },
    { href: "/history", label: t("nav.history", "History"), icon: History },
    { href: "/agriculture", label: t("nav.agriculture", "Agri"), icon: Sprout },
    { href: "/risks", label: t("nav.risks", "Risks"), icon: ShieldAlert },
    { href: "/copilot", label: t("nav.copilot", "Copilot"), icon: Bot },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 backdrop-blur-xl border-t border-[var(--border-subtle)]"
      style={{ background: "rgba(16, 17, 21, 0.92)" }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic("light")}
              className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all duration-150 ${
                isActive
                  ? "text-cyan-400 font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon size={18} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

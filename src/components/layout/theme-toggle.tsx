"use client";

import { useTheme } from "@/context/theme-context";
import { Sun, Moon } from "lucide-react";
import { triggerHaptic } from "@/lib/motion/haptics";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    triggerHaptic("light");
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="relative p-2 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          size={16}
          className={`absolute transition-all duration-300 transform text-amber-500 ${
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          size={16}
          className={`absolute transition-all duration-300 transform text-cyan-400 ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>
    </button>
  );
}

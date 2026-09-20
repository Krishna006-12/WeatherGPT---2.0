"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useLocation } from "@/context/location-context";
import { triggerHaptic } from "@/lib/motion/haptics";
import { AICopilotCard } from "./ai-copilot-card";

export function FloatingCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { selectedLocation } = useLocation();
  const pillRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Suppress floating widget on dedicated full-screen chat/copilot pages to avoid duplicate UI
  const isDedicatedChatPage = pathname === "/chat" || pathname === "/copilot";

  // Keyboard shortcut listener: Cmd/Ctrl + K to toggle, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (!isDedicatedChatPage) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }

      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        pillRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDedicatedChatPage]);

  // If user navigates to dedicated chat page while open, close flyout
  useEffect(() => {
    if (isDedicatedChatPage && isOpen) {
      setIsOpen(false);
    }
  }, [pathname, isDedicatedChatPage, isOpen]);

  if (isDedicatedChatPage) {
    return null;
  }

  const handleToggle = () => {
    triggerHaptic("light");
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    triggerHaptic("light");
    setIsOpen(false);
    pillRef.current?.focus();
  };

  return (
    <>
      {/* ── Collapsed Floating Pill (Fluid Spring Morph) ────────────────── */}
      {!isOpen && (
        <button
          ref={pillRef}
          type="button"
          onClick={handleToggle}
          aria-label="Open WeatherGPT AI Copilot"
          aria-expanded={false}
          aria-controls="floating-copilot-flyout"
          aria-haspopup="dialog"
          className="fixed z-40 bottom-22 right-4 md:bottom-6 md:right-6 group select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0c0f17] animate-[wg-pill-spring-in_350ms_cubic-bezier(0.34,1.35,0.64,1)_forwards] wg-tactile-press"
        >
          {/* Pill Container */}
          <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full backdrop-blur-2xl transition-all duration-300 border bg-white/90 dark:bg-[#0e1117]/90 border-black/10 dark:border-white/10 shadow-[0_12px_30px_-12px_rgba(14,165,233,0.35)] group-hover:shadow-[0_14px_38px_-8px_rgba(6,182,212,0.4)] group-hover:border-cyan-400/40 group-hover:scale-[1.025] active:scale-[0.98]">
            {/* Live Meteorological Grounding Indicator (Jewel pulse) */}
            <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 duration-1000" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
            </div>

            {/* Icon with fluid hover spring */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-cyan-500 dark:text-cyan-400 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)]"
              aria-hidden="true"
            >
              <Sparkles size={16} />
            </div>

            {/* Label */}
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-100 whitespace-nowrap">
              Ask WeatherGPT
            </span>

            {/* Keyboard Shortcut Tag (Desktop only) */}
            <kbd
              aria-hidden="true"
              className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/10 transition-colors group-hover:border-cyan-400/30"
            >
              ⌘K
            </kbd>
          </div>
        </button>
      )}

      {/* ── Expanded Functional Chat Flyout / Drawer ─────────────── */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-[fade-in_200ms_ease-out_forwards]"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            ref={flyoutRef}
            id="floating-copilot-flyout"
            role="dialog"
            aria-label="WeatherGPT AI Copilot Dialogue"
            aria-modal="true"
            className="fixed z-50
              /* Mobile bottom sheet */
              inset-x-0 bottom-0 h-[85vh] max-h-[85vh] rounded-t-[28px] border-t border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#0c0f17]/95 backdrop-blur-2xl shadow-[0_-12px_40px_rgba(15,23,42,0.18)]
              origin-bottom animate-[wg-morph-expand-mobile_320ms_cubic-bezier(0.16,1,0.3,1)_forwards]
              /* Desktop elevated floating flyout with fluid pill-to-card morph */
              md:inset-x-auto md:bottom-6 md:right-6 md:w-[420px] md:max-w-[calc(100vw-2rem)] md:h-[620px] md:max-h-[calc(100vh-4.5rem)] md:rounded-[28px] md:border md:border-black/10 md:dark:border-white/15 md:shadow-[0_24px_70px_rgba(15,23,42,0.22)]
              md:origin-bottom-right md:animate-[wg-morph-expand-desktop_340ms_cubic-bezier(0.16,1,0.3,1)_forwards]
              flex flex-col overflow-hidden will-change-[transform,opacity,border-radius]"
          >
            {/* Mobile Sheet Drag Handle */}
            <div
              className="md:hidden w-12 h-1 rounded-full bg-neutral-300 dark:bg-white/20 mx-auto mt-2.5 mb-1 shrink-0"
              aria-hidden="true"
            />

            {/* Embedded AICopilotCard in Floating Mode */}
            <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
              <AICopilotCard
                location={selectedLocation}
                initialExpanded={true}
                fullHeight={true}
                hideCollapse={false}
                isFloating={true}
                onClose={handleClose}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

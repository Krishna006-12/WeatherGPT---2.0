"use client";

/**
 * WeatherGPT 2.0 — ParallaxLayer Component.
 *
 * Depth-aware scroll layer applying differential velocity multipliers across
 * z-depth planes (background sky, mid clouds, foreground UI, overlay).
 * Operates strictly on the GPU compositor thread using `transform: translate3d`.
 */

import React, { useRef, useEffect } from "react";
import { useDeviceTier } from "@/lib/motion/device-tier";

export type ParallaxDepth = "background" | "mid" | "foreground" | "overlay";

export interface ParallaxLayerProps {
  depth: ParallaxDepth;
  children: React.ReactNode;
  speedMultiplier?: number;
  className?: string;
  style?: React.CSSProperties;
  maxOffsetPx?: number; // Clamping bound
  scrollContainerId?: string; // Optional custom scroll container
}

const DEFAULT_DEPTH_MULTIPLIERS: Record<ParallaxDepth, number> = {
  background: 0.2,
  mid: 0.5,
  foreground: 1.0,
  overlay: 0.0,
};

export function ParallaxLayer({
  depth,
  children,
  speedMultiplier,
  className = "",
  style = {},
  maxOffsetPx = 180,
  scrollContainerId,
}: ParallaxLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isReducedMotion, parallaxMultiplier } = useDeviceTier();

  const baseMultiplier =
    speedMultiplier !== undefined ? speedMultiplier : DEFAULT_DEPTH_MULTIPLIERS[depth];
  const effectiveMultiplier = isReducedMotion ? 0 : baseMultiplier * parallaxMultiplier;

  useEffect(() => {
    if (effectiveMultiplier === 0) {
      if (containerRef.current) {
        containerRef.current.style.transform = "translate3d(0, 0, 0)";
      }
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    let targetElement: Window | HTMLElement = window;
    if (scrollContainerId) {
      const el = document.getElementById(scrollContainerId);
      if (el) targetElement = el;
    }

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY =
            targetElement === window
              ? window.scrollY || window.pageYOffset
              : (targetElement as HTMLElement).scrollTop;

          // Parallax displacement: (1 - multiplier) * scroll relative offset
          const rawOffset = scrollY * (1 - effectiveMultiplier) * 0.4;
          const clampedOffset = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, rawOffset));

          if (element) {
            element.style.transform = `translate3d(0px, ${clampedOffset.toFixed(2)}px, 0px)`;
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    targetElement.addEventListener("scroll", onScroll, { passive: true });
    // Initial position evaluation
    onScroll();

    return () => {
      targetElement.removeEventListener("scroll", onScroll);
      if (element) {
        element.style.transform = "translate3d(0, 0, 0)";
      }
    };
  }, [effectiveMultiplier, maxOffsetPx, scrollContainerId]);

  return (
    <div
      ref={containerRef}
      data-depth={depth}
      className={`will-change-transform ${className}`}
      style={{
        ...style,
        transform: "translate3d(0, 0, 0)",
      }}
    >
      {children}
    </div>
  );
}

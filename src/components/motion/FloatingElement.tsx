"use client";

/**
 * WeatherGPT 2.0 — FloatingElement Component.
 *
 * Wraps any weather UI element in the antigravity physics model:
 * - Buoyant, multi-axis Lissajous drift with element-seeded PRNG.
 * - Inertial momentum decay on pointer drag / flick.
 * - Micro-interaction press response (scale 0.96 with snappy spring).
 * - Offscreen culling via IntersectionObserver and tab-background throttling via visibilitychange.
 * - Zero layout thrashing: animates exclusively via GPU-composited `transform: translate3d`.
 */

import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  type MassTier,
  generateDriftHarmonics,
  computeAmbientDrift,
  computeImpulseDisplacement,
  type MomentumImpulseState,
} from "@/lib/motion/antigravity";
import { useDeviceTier } from "@/lib/motion/device-tier";
import { triggerHaptic } from "@/lib/motion/haptics";

export interface FloatingElementProps {
  id: string;
  children: React.ReactNode;
  massTier?: MassTier;
  envelopeScale?: number;
  draggable?: boolean;
  pressScale?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onPress?: () => void;
  disabled?: boolean;
}

export function FloatingElement({
  id,
  children,
  massTier = "medium",
  envelopeScale = 1.0,
  draggable = false,
  pressScale = true,
  className = "",
  style = {},
  onPress,
  disabled = false,
}: FloatingElementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tier, driftEnvelopeScale, isReducedMotion } = useDeviceTier();

  // Deterministically precompute harmonics from element ID once
  const harmonics = useMemo(() => generateDriftHarmonics(id, massTier), [id, massTier]);

  // Active impulse state (from drag release or impulse nudge)
  const impulseRef = useRef<MomentumImpulseState | null>(null);

  // Drag tracking state
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragCurrentOffsetRef = useRef({ x: 0, y: 0 });
  const lastPointerMoveRef = useRef({ time: 0, x: 0, y: 0 });
  const pointerVelocityRef = useRef({ vx: 0, vy: 0 });

  // Press micro-interaction state
  const [isPressed, setIsPressed] = useState(false);

  // Visibility and viewport tracking
  const isVisibleRef = useRef(true);
  const isTabActiveRef = useRef(true);

  // Effective envelope scaling combining device tier + prop scale
  const effectiveEnvelopeScale = disabled || isReducedMotion
    ? 0
    : envelopeScale * driftEnvelopeScale;

  useEffect(() => {
    if (disabled || isReducedMotion || effectiveEnvelopeScale === 0) {
      if (containerRef.current) {
        containerRef.current.style.transform = "translate3d(0, 0, 0)";
      }
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    // 1. IntersectionObserver to cull off-screen animations
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = !!entry?.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(element);

    // 2. Visibility change listener for tab backgrounding
    const handleVisibilityChange = () => {
      isTabActiveRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. High-performance RAF loop
    let rafId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (isVisibleRef.current && isTabActiveRef.current) {
        // Base ambient Lissajous drift
        const drift = computeAmbientDrift(
          now - startTime,
          harmonics,
          massTier,
          effectiveEnvelopeScale
        );

        let totalX = drift.x;
        let totalY = drift.y;
        let totalRot = drift.rotationDeg;

        // If currently dragging, override with pointer offset
        if (isDraggingRef.current) {
          totalX += dragCurrentOffsetRef.current.x;
          totalY += dragCurrentOffsetRef.current.y;
        } else if (impulseRef.current) {
          // If in momentum settle phase, add decaying impulse displacement
          const impulseResult = computeImpulseDisplacement(impulseRef.current, now);
          totalX += impulseResult.x;
          totalY += impulseResult.y;

          if (impulseResult.settled) {
            impulseRef.current = null;
            triggerHaptic("snap");
          }
        }

        // Apply scale during press micro-interaction
        const scaleVal = isPressed && pressScale ? 0.96 : 1.0;

        element.style.transform = `translate3d(${totalX.toFixed(2)}px, ${totalY.toFixed(2)}px, 0px) rotate(${totalRot.toFixed(2)}deg) scale(${scaleVal})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (element) {
        element.style.transform = "translate3d(0, 0, 0)";
      }
    };
  }, [disabled, isReducedMotion, effectiveEnvelopeScale, harmonics, massTier, isPressed, pressScale]);

  // Pointer event handlers for fluid inertia and micro-interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsPressed(true);

    if (draggable) {
      isDraggingRef.current = true;
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragCurrentOffsetRef.current = { x: 0, y: 0 };
      lastPointerMoveRef.current = { time: performance.now(), x: e.clientX, y: e.clientY };
      pointerVelocityRef.current = { vx: 0, vy: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastPointerMoveRef.current.time);
    const dx = e.clientX - lastPointerMoveRef.current.x;
    const dy = e.clientY - lastPointerMoveRef.current.y;

    // Moving average of pointer velocity (px/ms)
    pointerVelocityRef.current = {
      vx: dx / dt,
      vy: dy / dt,
    };

    dragCurrentOffsetRef.current = {
      x: e.clientX - dragStartPosRef.current.x,
      y: e.clientY - dragStartPosRef.current.y,
    };

    lastPointerMoveRef.current = { time: now, x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPressed(false);

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback if capture already released
      }

      // Carry velocity into exponential momentum decay
      const vx = pointerVelocityRef.current.vx;
      const vy = pointerVelocityRef.current.vy;

      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        impulseRef.current = {
          initialVelocityX: Math.max(-2.5, Math.min(2.5, vx)),
          initialVelocityY: Math.max(-2.5, Math.min(2.5, vy)),
          startTimeMs: performance.now(),
          massTier,
        };
      } else {
        impulseRef.current = null;
      }
    }

    onPress?.();
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
    isDraggingRef.current = false;
    impulseRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      id={`floating-${id}`}
      data-testid={`floating-element-${id}`}
      data-mass-tier={massTier}
      data-device-tier={tier}
      className={`will-change-transform ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}
      style={{
        ...style,
        transform: "translate3d(0, 0, 0)",
        touchAction: draggable ? "none" : "auto",
        transition: isReducedMotion ? "opacity 150ms ease" : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={draggable ? handlePointerMove : undefined}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {children}
    </div>
  );
}

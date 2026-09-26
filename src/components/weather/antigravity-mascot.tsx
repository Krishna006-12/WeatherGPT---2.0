 "use client";

import { useEffect, useRef, useState, useId } from "react";
import Image from "next/image";
import {
  AntigravitySpring,
  ValueNoise,
  getWeatherAntigravityConfig,
  type AntigravityMascotConfig,
} from "@/lib/motion/antigravity-spring";

export interface AntigravityMascotProps {
  imageSrc: string;
  alt: string;
  accentColor?: string;
  weatherType?: "sunny" | "cloudy" | "rainy" | "snowy";
  className?: string;
  pointerReactive?: boolean;
  customConfig?: Partial<AntigravityMascotConfig>;
  priority?: boolean;
}

interface ParticleState {
  baseX: number; // 0..1
  phase: number;
  size: number;
  speed: number;
}

export function AntigravityMascot({
  imageSrc,
  alt,
  accentColor = "#f59e0b",
  weatherType = "sunny",
  className = "",
  pointerReactive = true,
  customConfig,
  priority = true,
}: AntigravityMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  const rimLightRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const pointerNormRef = useRef({ x: 0, y: 0, isHovering: false });
  const uniqueId = useId();

  // Determine configuration based on weather condition
  const baseConfig = getWeatherAntigravityConfig(weatherType);
  const config: AntigravityMascotConfig = {
    ...baseConfig,
    ...customConfig,
  };

  // Generate particle definitions once per weather type / particle count
  const particlesDataRef = useRef<ParticleState[]>([]);
  if (particlesDataRef.current.length !== config.particleCount) {
    const arr: ParticleState[] = [];
    for (let i = 0; i < config.particleCount; i++) {
      // Deterministic spread
      const pseudo = (Math.sin(i * 997.3 + 12.5) + 1) / 2;
      arr.push({
        baseX: (i / config.particleCount + pseudo * 0.2) % 1,
        phase: i * 1.35,
        size: 2.5 + (i % 3) * 1.2,
        speed: 0.4 + ((i % 4) * 0.15),
      });
    }
    particlesDataRef.current = arr;
  }

  // Detect accessibility preference
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.("change", listener);
    return () => mediaQuery.removeEventListener?.("change", listener);
  }, []);

  // Set up physics simulation loop
  useEffect(() => {
    if (prefersReducedMotion) return;

    const noiseX = new ValueNoise(101);
    const noiseY = new ValueNoise(202);

    const xSprings = config.layerDepths.map((depth, i) => {
      return new AntigravitySpring({
        stiffness: config.stiffness,
        damping: config.damping,
        amplitude: config.swayAmplitudePx * depth,
        frequency: config.noiseFrequency,
        noise: noiseX,
        phaseOffsetSeconds: (config.layerPhaseOffsetMs[i] ?? 0) / 1000.0,
      });
    });

    const ySprings = config.layerDepths.map((depth, i) => {
      return new AntigravitySpring({
        stiffness: config.stiffness,
        damping: config.damping,
        amplitude: config.bobAmplitudePx * depth,
        // Incommensurate frequency so X and Y wander path is organic and non-repeating
        frequency: config.noiseFrequency * 0.79,
        noise: noiseY,
        phaseOffsetSeconds: (config.layerPhaseOffsetMs[i] ?? 0) / 1000.0 + 0.45,
      });
    });

    const tiltSpring = new AntigravitySpring({
      stiffness: config.stiffness * 2.2, // Tilt catches up slightly faster
      damping: config.damping,
      amplitude: config.maxTiltDegrees,
      frequency: config.noiseFrequency,
      noise: noiseX,
    });

    let lastTime: number | null = null;
    let elapsedSeconds = 0;
    let animId: number;

    const tick = (now: number) => {
      if (lastTime === null) {
        lastTime = now;
      }
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsedSeconds += dt;

      // Update springs
      for (const s of xSprings) s.step(dt, elapsedSeconds);
      for (const s of ySprings) s.step(dt, elapsedSeconds);

      if (pointerReactive && pointerNormRef.current.isHovering) {
        tiltSpring.setExternalTarget(
          pointerNormRef.current.x * config.maxTiltDegrees
        );
      } else {
        tiltSpring.clearExternalTarget();
      }
      tiltSpring.step(dt, elapsedSeconds);

      const posX0 = xSprings[0]?.position ?? 0;
      const posY0 = ySprings[0]?.position ?? 0;
      const posX1 = xSprings[1]?.position ?? 0;
      const posY1 = ySprings[1]?.position ?? 0;
      const posX2 = xSprings[2]?.position ?? 0;
      const posY2 = ySprings[2]?.position ?? 0;
      const tiltDeg = tiltSpring.position;

      // 1. Breathing Contact Shadow: shrinks & blurs more as the mascot bobs higher
      if (shadowRef.current) {
        const shadowScaleX = Math.max(0.7, 1 - Math.abs(posY1) * 0.018);
        const shadowScaleY = Math.max(0.65, 1 - Math.abs(posY1) * 0.024);
        const shadowOpacity = Math.min(0.35, Math.max(0.12, 0.28 - posY1 * 0.008));
        const shadowBlur = Math.max(4, 10 + posY1 * 0.4);

        shadowRef.current.style.transform = `translate3d(${posX0 * 0.35}px, 0px, 0) scale(${shadowScaleX}, ${shadowScaleY})`;
        shadowRef.current.style.opacity = `${shadowOpacity}`;
        shadowRef.current.style.filter = `blur(${shadowBlur}px)`;
      }

      // 2. Character Body & Dimensional Tilt
      if (bodyWrapperRef.current) {
        const rotateY = tiltDeg * 0.85;
        const rotateX = -posY1 * 0.2;
        bodyWrapperRef.current.style.transform = `translate3d(${posX1}px, ${posY1}px, 0) perspective(600px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) rotateZ(${tiltDeg * 0.25}deg)`;
      }

      // 3. Ambient Dynamic Rim-Light Parallax
      if (rimLightRef.current) {
        const rimOffsetX = posX2 * 0.8 + tiltDeg * 1.5;
        const rimOffsetY = posY2 * 0.8;
        rimLightRef.current.style.transform = `translate3d(${rimOffsetX}px, ${rimOffsetY}px, 0) scale(${1 + Math.sin(elapsedSeconds * 1.5) * 0.05})`;
      }

      // 4. Ambient Weather Particles: independent harmonic drift and slow climb/fall
      if (particlesRef.current && config.enableParticles) {
        const particleEls = particlesRef.current.children;
        const count = Math.min(particleEls.length, particlesDataRef.current.length);
        const containerH = containerRef.current?.clientHeight || 240;
        const containerW = containerRef.current?.clientWidth || 180;

        for (let i = 0; i < count; i++) {
          const p = particlesDataRef.current[i];
          const el = particleEls[i] as HTMLElement | undefined;
          if (!p || !el) continue;

          const t = elapsedSeconds * p.speed + p.phase;
          const pDriftX = Math.sin(t * 1.2) * 12 + posX2 * 0.4;
          // Float upward or downward depending on weather (rain/snow falls, sun/wind rises)
          const direction = weatherType === "rainy" || weatherType === "snowy" ? 1 : -1;
          const rawY = direction * (t * 22) % containerH;
          const pY = rawY < 0 ? rawY + containerH : rawY;
          const pX = p.baseX * containerW + pDriftX;
          const pOpacity = (Math.sin(t * 2.0) * 0.4 + 0.6) * (weatherType === "snowy" ? 0.8 : 0.6);

          el.style.transform = `translate3d(${pX}px, ${pY}px, 0)`;
          el.style.opacity = `${pOpacity}`;
        }
      }

      animId = reqAnim(tick);
    };

    const reqAnim =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
    const cancelAnim =
      typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function"
        ? window.cancelAnimationFrame
        : (id: number) => clearTimeout(id);

    animId = reqAnim(tick);

    return () => {
      cancelAnim(animId);
    };
  }, [
    prefersReducedMotion,
    pointerReactive,
    weatherType,
    config.stiffness,
    config.damping,
    config.noiseFrequency,
    config.bobAmplitudePx,
    config.swayAmplitudePx,
    config.maxTiltDegrees,
    config.enableParticles,
    config.layerDepths,
    config.layerPhaseOffsetMs,
    config.particleCount,
  ]);

  // Pointer tracking handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerReactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
    const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

    pointerNormRef.current = { x: normX, y: normY, isHovering: true };
  };

  const handlePointerLeave = () => {
    pointerNormRef.current = { x: 0, y: 0, isHovering: false };
  };

  return (
    <div
      ref={containerRef}
      id={`antigravity-mascot-container-${uniqueId}`}
      data-testid="antigravity-mascot"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      className={`relative w-full flex items-center justify-center select-none ${className}`}
      style={{ touchAction: "none" }}
    >
      {/* 1. Dynamic Ambient Rim-Light / Mood Aura */}
      <div
        ref={rimLightRef}
        aria-hidden="true"
        className="absolute w-44 h-44 rounded-full pointer-events-none opacity-30 blur-2xl transition-colors duration-700"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* 2. Character Body & Dimensional Frame */}
      <div
        ref={bodyWrapperRef}
        className="relative w-36 sm:w-44 h-52 sm:h-60 rounded-2xl overflow-hidden shadow-md border border-white/20 dark:border-white/10 group z-10 will-change-transform"
      >
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes="(max-width: 640px) 144px, 176px"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
      </div>

      {/* 3. Ambient Weather Particles */}
      {config.enableParticles && !prefersReducedMotion && (
        <div
          ref={particlesRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden z-20"
        >
          {particlesDataRef.current.map((p, idx) => (
            <span
              key={idx}
              className="absolute block rounded-full pointer-events-none will-change-transform"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor:
                  weatherType === "snowy"
                    ? "#ffffff"
                    : weatherType === "rainy"
                    ? "#38bdf8"
                    : weatherType === "cloudy"
                    ? "#fdba74"
                    : accentColor,
                boxShadow: `0 0 6px ${accentColor}80`,
              }}
            />
          ))}
        </div>
      )}

      {/* 4. Dynamic Breathing Ground Contact Shadow */}
      <div
        aria-hidden="true"
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-0"
      >
        <div
          ref={shadowRef}
          className="w-28 h-5 rounded-full bg-black/40 dark:bg-black/60 will-change-transform transition-opacity"
        />
      </div>
    </div>
  );
}

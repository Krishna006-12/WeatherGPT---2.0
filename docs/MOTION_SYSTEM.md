# WeatherGPT 2.0 — Antigravity Motion & Physics System Specification

This document defines the mathematical foundation, physical constants, architectural boundaries, and performance budgets governing the WeatherGPT 2.0 motion system.

Inspired by Apple-caliber spatial and meteorological interfaces (visionOS spatial UI, iOS Weather app parallax, macOS Sonoma widget physics), every motion in WeatherGPT 2.0 communicates state (loading, updating, alert severity, data freshness) and degrades gracefully to a static state under reduced motion.

---

## 1. Antigravity Physics Model (`src/lib/motion/antigravity.ts`)

Ad-hoc animation numbers and random CSS transitions are strictly prohibited. All floating elements consume the centralized physics model.

### 1.1 Zero-Gravity Simulation & Restoring Buoyancy
- **Base Gravity**: $g = 0\,\text{px/ms}^2$ for all floating weather elements.
- **Buoyancy Force ($B$)**: A gentle, restoring spring-like envelope keeping elements within a vertical resting band rather than locking to a single rigid point:
  - Resting Vertical Envelope: $\pm 8\text{–}14\,\text{px}$.
  - Buoyancy Constant ($K_b$): $0.022\text{–}0.050\,\text{px/ms}^2$.

### 1.2 Weightlessness Timing & Seeded PRNG
- **Base Period**: $4.5\text{–}7.5\,\text{s}$ per full oscillation cycle.
- **Deterministic Instance Seeding**: To guarantee that multiple floating elements never oscillate in visual lockstep, each element's period, phase, and frequency ratios are deterministically randomized $\pm 15\%$ using an FNV-1a 32-bit hash of the element's string `id`.
- **Zero Hydration Mismatch**: `Math.random()` is **never** evaluated on render. All values are pure functions of $(id, massTier)$.

### 1.3 Lissajous Multi-Harmonic Drift Dynamics
Mechanical, single-sine motion feels artificial. Each floating element computes independent $X$, $Y$, and rotation axes as the sum of incommensurate frequencies using irrational mathematical ratios:
- **Golden Ratio Frequency Multiplier**: $\phi \approx 1.61803398875$
- **Square Root of Two**: $\sqrt{2} \approx 1.41421356237$
- **Square Root of Five**: $\sqrt{5} \approx 2.2360679775$

$$\begin{aligned}
Y(t) &= A_y \cdot [ 0.55 \sin(\omega_1 t + \phi_{y1}) + 0.30 \sin(1.618 \omega_1 t + \phi_{y2}) + 0.15 \sin(2.236 \omega_1 t + \phi_{y3}) ] \\
X(t) &= A_x \cdot [ 0.65 \sin(0.618 \omega_1 t + \phi_{x1}) + 0.35 \sin(1.414 \omega_1 t + \phi_{x2}) ] \\
\theta(t) &= A_\theta \cdot [ 0.70 \sin(0.707 \omega_1 t + \phi_{r1}) + 0.30 \sin(1.272 \omega_1 t + \phi_{r2}) ]
\end{aligned}$$

### 1.4 Mass & Inertia Tiers

| Mass Tier | Typical Elements | Time Constant $\tau$ | Settle Time | Impulse Sensitivity | Envelope ($Y / X / \theta$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `light` | Particles, alert pills, badges | $420\,\text{ms}$ | $2,200\,\text{ms}$ | $1.0\times$ | $\pm 8\,\text{px} \,/\, \pm 4\,\text{px} \,/\, \pm 1.5^\circ$ |
| `medium` | Forecast cards, sunrise, impact | $580\,\text{ms}$ | $3,100\,\text{ms}$ | $0.65\times$ | $\pm 11\,\text{px} \,/\, \pm 5.5\,\text{px} \,/\, \pm 1.0^\circ$ |
| `heavy` | Hero temp dial, main surface | $780\,\text{ms}$ | $4,200\,\text{ms}$ | $0.35\times$ | $\pm 14\,\text{px} \,/\, \pm 7.0\,\text{px} \,/\, \pm 0.6^\circ$ |

### 1.5 Momentum Decay on External Impulse
When an element is released from a pointer drag, flicked, or nudged by incoming live data, velocity decays exponentially:

$$v(t) = v_0 \cdot e^{-t / \tau}$$
$$x_{\text{impulse}}(t) = v_0 \cdot \tau \cdot (1 - e^{-t / \tau})$$

Linear decay is strictly prohibited — it reads as artificial mechanical braking rather than physical fluid settling.

---

## 2. Apple System Easings & Spring Physics (`src/lib/motion/easings.ts`)

### 2.1 Cubic-Bezier Curves
- `--ease-standard`: `cubic-bezier(0.4, 0.0, 0.2, 1)` — for general navigation transitions.
- `--ease-decelerate`: `cubic-bezier(0.0, 0.0, 0.2, 1)` — for elements entering the viewport.
- `--ease-accelerate`: `cubic-bezier(0.4, 0.0, 1, 1)` — for elements exiting the viewport.

### 2.2 Analytical Damped Harmonic Oscillator
For any user interaction (pointer drag release, carousel snap), an exact analytical harmonic oscillator is solved:

$$m \frac{d^2x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

- **Damping Ratio**: $\zeta = \frac{c}{2\sqrt{km}}$
- **Elastic Overshoot Tuning**:
  - `APPLE_SPRINGS.snappy`: $\{ m: 1.0, k: 280, c: 24.5 \} \implies \zeta \approx 0.732$.
  - Produces controlled $4\text{–}8\%$ overshoot before coming to rest.
  - Damping ratio is never set below $0.60$ (which causes toy-like visual ringing).
- **Critically Damped Fallback**:
  - `APPLE_SPRINGS.criticallyDamped`: $\{ m: 1.0, k: 180, c: 26.83 \} \implies \zeta = 1.0$.
  - Used on medium/low device tiers to eliminate overshoot and minimize frame cost.

### 2.3 Velocity-Aware Snap-to
For carousels (e.g. hourly forecast cards), the release velocity $v_{\text{release}}$ determines the destination:
- If $|v_{\text{release}}| > 0.45\,\text{px/ms}$, the carousel snaps in the velocity direction even if travel distance was $< 50\%$ of item width.
- Otherwise, snaps to nearest card.

---

## 3. Depth-Aware Parallax System (`src/components/motion/ParallaxLayer.tsx`)

Parallax creates spatial depth without breaking the GPU compositor:
- **Background Layer (Sky, Atmospherics)**: `0.2x` scroll velocity.
- **Mid Layer (Clouds, Precipitation Vectors)**: `0.5x` scroll velocity.
- **Foreground Layer (Cards, Dial, Telemetry)**: `1.0x` scroll velocity.
- **Overlay Layer (Alert Drawer, Modals)**: `0.0x` (pinned).

All movement is executed via `transform: translate3d(0, y, 0)`. Modifying `top`, `left`, or `margin` is strictly forbidden.

---

## 4. Adaptive Device Tiers (`src/lib/motion/device-tier.ts`)

| Parameter | High Tier | Medium Tier | Low Tier / Reduced Motion |
| :--- | :--- | :--- | :--- |
| **Detection** | $\ge 8$ cores, $\ge 8\,\text{GB}$ RAM, clean RAF | $4\text{–}7$ cores, or fallback | $\le 2$ cores, $\le 2\,\text{GB}$ RAM, or `prefers-reduced-motion` |
| **Drift Envelope** | $100\%$ ($1.0\times$) | $50\%$ ($0.5\times$) | $0\%$ (Static, no drift) |
| **Parallax Multiplier** | $1.0\times$ | $0.5\times$ | $0.0\times$ (Disabled) |
| **Spring Overshoot** | $4\text{–}8\%$ enabled | Disabled ($\zeta = 1.0$) | Disabled |
| **Glassmorphism** | 20px blur + 180% saturation | 20px blur + 180% saturation | Solid opaque fallback |
| **Max Transition** | Normal ($400\,\text{ms}$) | Fast ($250\,\text{ms}$) | Instant / Fade ($150\,\text{ms}$) |

### Hard Override: `prefers-reduced-motion`
The OS-level user preference unconditionally overrides all device telemetry. When active, all ambient drift and parallax are zeroed out, and transitions use simple opacity cross-fades under $150\,\text{ms}$.

---

## 5. Performance Budget (60 FPS Non-Negotiable)

1. **Main-Thread JavaScript per Frame**: $< 4\,\text{ms}$.
2. **Transform Only**: Animates exclusively `transform` and `opacity`.
3. **Offscreen & Background Culling**:
   - `IntersectionObserver` automatically pauses calculation when an element leaves the viewport.
   - `document.visibilitychange` freezes the animation loop when the browser tab is backgrounded.
4. **Dev-Mode FPS Telemetry**:
   - Toggle with `NEXT_PUBLIC_DEBUG_FPS=1` or `?debug_fps=1`.
   - Displays real-time instantaneous FPS, 60-frame rolling average, frame delta in milliseconds, and dropped frame counts.

---

## 6. Micro-Interactions, Glassmorphism & Display-P3

### 6.1 Press Interaction
Interactive elements scale to `0.96` on pointer down with `--ease-spring-snappy`, returning smoothly on pointer up.

### 6.2 Apple Glassmorphism
Applied exclusively to transient overlay surfaces (`.wg-glass-overlay`: alert drawer, AI chat panel, modal sheets), never to primary content cards:
```css
.wg-glass-overlay {
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### 6.3 Wide Color Gamut (Display-P3)
Accelerated via CSS `@supports (color: color(display-p3 1 1 1))` with sRGB fallbacks for high-fidelity vibrancy on Apple and wide-gamut displays.

### 6.4 Haptic Feedback
Non-blocking tactile tick (`navigator.vibrate(10)`) triggered on snap-settling and alert-severity changes, silently no-oping on unsupported platforms.

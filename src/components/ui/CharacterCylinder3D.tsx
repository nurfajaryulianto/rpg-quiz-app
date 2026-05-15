"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CharacterCylinder3DProps {
  /** 8 SVG inner strings, one per angle (0=front … 7=3/4-left) */
  frames: string[];
  /** active angle index 0-7 */
  angle: number;
  onAngleChange: (a: number) => void;
  accentColor?: string;
  glowColor?: string;
  width?: number;
  height?: number;
  /** pop animation trigger */
  pop?: boolean;
}

const FACES = 8;
const ANGLE_STEP = 360 / FACES; // 45°

export default function CharacterCylinder3D({
  frames,
  angle,
  onAngleChange,
  accentColor = "#a78bfa",
  glowColor = "rgba(167,139,250,0.35)",
  width = 220,
  height = 270,
  pop = false,
}: CharacterCylinder3DProps) {
  // The cylinder rotation in degrees (continuous, not clamped to 0-360)
  const [rotY, setRotY] = useState(0);
  // Track target rotation to snap to nearest angle face
  const targetRotRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const currentRotRef = useRef(0);

  // Pointer drag state
  const dragStartX = useRef<number | null>(null);
  const dragStartRot = useRef(0);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Sync external angle → rotation when angle changes externally
  const lastAngleRef = useRef(angle);
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (lastAngleRef.current === angle) return;
    lastAngleRef.current = angle;
    // Compute closest rotation for this angle
    const targetDeg = -angle * ANGLE_STEP;
    // Find closest multiple that minimizes jump
    const current = currentRotRef.current;
    const diff = ((targetDeg - current) % 360 + 540) % 360 - 180;
    targetRotRef.current = current + diff;
    animateToTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle]);

  const animateToTarget = useCallback(() => {
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    const ease = () => {
      const diff = targetRotRef.current - currentRotRef.current;
      if (Math.abs(diff) < 0.05) {
        currentRotRef.current = targetRotRef.current;
        setRotY(currentRotRef.current);
        animFrameRef.current = null;
        return;
      }
      currentRotRef.current += diff * 0.14;
      setRotY(currentRotRef.current);
      animFrameRef.current = requestAnimationFrame(ease);
    };
    animFrameRef.current = requestAnimationFrame(ease);
  }, []);

  const snapToAngle = useCallback(() => {
    // Convert current rotation to angle index
    const deg = ((-currentRotRef.current % 360) + 360) % 360;
    const idx = Math.round(deg / ANGLE_STEP) % FACES;
    const snapped = -idx * ANGLE_STEP;
    // Find nearest
    const current = currentRotRef.current;
    const base = Math.round(current / 360) * 360 + snapped;
    const candidates = [base - 360, base, base + 360];
    targetRotRef.current = candidates.reduce((a, b) =>
      Math.abs(a - current) < Math.abs(b - current) ? a : b
    );
    lastAngleRef.current = idx;
    onAngleChange(idx);
    animateToTarget();
  }, [animateToTarget, onAngleChange]);

  // Inertia after drag
  const inertiaRef = useRef<number | null>(null);
  const runInertia = useCallback(() => {
    if (Math.abs(velocityRef.current) < 0.2) {
      snapToAngle();
      return;
    }
    currentRotRef.current += velocityRef.current;
    velocityRef.current *= 0.88;
    setRotY(currentRotRef.current);

    // Update angle indicator while coasting
    const deg = ((-currentRotRef.current % 360) + 360) % 360;
    const idx = Math.round(deg / ANGLE_STEP) % FACES;
    if (idx !== lastAngleRef.current) {
      lastAngleRef.current = idx;
      onAngleChange(idx);
    }

    inertiaRef.current = requestAnimationFrame(runInertia);
  }, [snapToAngle, onAngleChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (inertiaRef.current !== null) cancelAnimationFrame(inertiaRef.current);
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartRot.current = currentRotRef.current;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    // 1 px drag = ~0.9 degrees (tweak sensitivity here)
    currentRotRef.current = dragStartRot.current + dx * 0.9;
    setRotY(currentRotRef.current);

    // Track velocity
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = ((e.clientX - lastXRef.current) / dt) * 16 * 0.9;
    }
    lastXRef.current = e.clientX;
    lastTimeRef.current = now;

    // Update angle indicator live
    const deg = ((-currentRotRef.current % 360) + 360) % 360;
    const idx = Math.round(deg / ANGLE_STEP) % FACES;
    if (idx !== lastAngleRef.current) {
      lastAngleRef.current = idx;
      onAngleChange(idx);
    }
  };

  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStartX.current = null;
    inertiaRef.current = requestAnimationFrame(runInertia);
  };

  // Touch passthrough
  const onTouchStart = (e: React.TouchEvent) => e.preventDefault();

  // The radius for the cylinder so faces don't overlap
  // For 8 faces: r = (faceWidth/2) / tan(π/8)
  const faceW = width;
  const faceH = height;
  const radius = Math.round((faceW / 2) / Math.tan(Math.PI / FACES));

  // Lighting: compute which faces are "lit" based on rotY
  const getLighting = (faceIdx: number) => {
    // Face faces a direction determined by its angle in the cylinder
    // faceAngle = faceIdx * ANGLE_STEP  (where we placed it)
    // actual facing angle in world = faceAngle + rotY
    const faceWorldAngle = (faceIdx * ANGLE_STEP + rotY) % 360;
    // Light comes from slightly left of front (-20deg)
    const lightAngle = -20;
    let diff = ((faceWorldAngle - lightAngle) % 360 + 360) % 360;
    if (diff > 180) diff = 360 - diff;
    // diff: 0 = facing light (bright), 180 = facing away (dark)
    const brightness = 0.55 + 0.45 * Math.cos((diff * Math.PI) / 180);
    return brightness;
  };

  return (
    <div
      className="relative select-none"
      style={{ width: faceW, height: faceH }}
    >
      {/* 3D scene container */}
      <div
        style={{
          width: faceW,
          height: faceH,
          perspective: radius * 3.5,
          perspectiveOrigin: "50% 45%",
          cursor: isDraggingRef.current ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
      >
        {/* Cylinder wrapper — rotates around Y axis */}
        <div
          style={{
            width: faceW,
            height: faceH,
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotY}deg)`,
            // No transition here — we handle easing in JS for inertia
          }}
        >
          {frames.map((svgInner, i) => {
            const faceRotY = i * ANGLE_STEP;
            const brightness = getLighting(i);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: faceW,
                  height: faceH,
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${faceRotY}deg) translateZ(${radius}px)`,
                  backfaceVisibility: "hidden",
                }}
              >
                {/* SVG character */}
                <svg
                  viewBox="0 0 200 245"
                  width={faceW}
                  height={faceH}
                  className={`block drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] ${pop && i === angle ? "animate-maple-pop" : ""}`}
                  dangerouslySetInnerHTML={{ __html: `<g>${svgInner}</g>` }}
                />
                {/* Lighting overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: brightness > 0.5
                      ? `rgba(255,255,255,${(brightness - 0.5) * 0.18})`
                      : `rgba(0,0,10,${(0.5 - brightness) * 0.55})`,
                    pointerEvents: "none",
                    mixBlendMode: "overlay",
                    borderRadius: 8,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Ground glow (stays flat, not in 3D) */}
      <div
        className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2"
        style={{
          width: 160,
          height: 24,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${accentColor}55 0%, transparent 70%)`,
          filter: "blur(6px)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/10"
        style={{
          width: 120,
          height: 12,
          background: `radial-gradient(ellipse, ${glowColor}, transparent 70%)`,
        }}
      />

      {/* Drag hint shimmer on first render */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-between px-1 opacity-40"
        style={{ transition: "opacity 0.5s" }}
      >
        <div className="text-white/20 text-xl select-none">‹</div>
        <div className="text-white/20 text-xl select-none">›</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface CharacterSpriteViewerProps {
  /** 8 SVG inner strings for angles 0-7 */
  frames: string[];
  /** Current angle index 0-7 */
  angle: number;
  onAngleChange: (a: number) => void;
  /** Character name shown in the nameplate at bottom */
  name?: string;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
  /** Auto-rotate after 4s of idle (default true) */
  autoRotate?: boolean;
}

const DIMS = {
  sm: { fw: 140, fh: 172, sw: 108, sh: 132 },
  md: { fw: 200, fh: 244, sw: 156, sh: 191 },
  lg: { fw: 240, fh: 290, sw: 192, sh: 234 },
};

const DIR_LABELS = ["Front", "¾ Right", "Side R", "Back R", "Back", "Back L", "Side L", "¾ Left"];

export default function CharacterSpriteViewer({
  frames,
  angle,
  onAngleChange,
  name,
  accentColor = "#c8a44a",
  size = "md",
  autoRotate = true,
}: CharacterSpriteViewerProps) {
  const [shown, setShown] = useState(angle);
  const [fading, setFading] = useState(false);
  const [bobY, setBobY] = useState(0);

  const angleRef = useRef(angle);
  const lastInteractRef = useRef(Date.now());
  const dragXRef = useRef<number | null>(null);
  const dragBaseRef = useRef(0);

  // Keep angleRef in sync with prop
  useEffect(() => {
    angleRef.current = angle;
  }, [angle]);

  // Idle bob — smooth sine wave via rAF
  useEffect(() => {
    let raf: number;
    let t = 0;
    const tick = () => {
      t += 0.038;
      setBobY(Math.sin(t) * 5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cross-fade when angle prop changes
  useEffect(() => {
    if (angle === shown) return;
    setFading(true);
    const tid = setTimeout(() => {
      setShown(angle);
      setFading(false);
    }, 100);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle]);

  // Auto-rotate after 4 s of no interaction
  useEffect(() => {
    if (!autoRotate) return;
    const tid = setInterval(() => {
      if (Date.now() - lastInteractRef.current > 4000) {
        onAngleChange((angleRef.current + 1) % 8);
      }
    }, 1500);
    return () => clearInterval(tid);
  }, [autoRotate, onAngleChange]);

  const interact = () => {
    lastInteractRef.current = Date.now();
  };

  // Pointer drag — horizontal drag changes angle
  const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
    interact();
    dragXRef.current = e.clientX;
    dragBaseRef.current = angleRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragXRef.current === null) return;
    const steps = Math.round((e.clientX - dragXRef.current) / 44);
    const next = ((dragBaseRef.current - steps) % 8 + 8) % 8;
    if (next !== angleRef.current) onAngleChange(next);
  };
  const onPU = () => {
    dragXRef.current = null;
  };

  const d = DIMS[size];
  const AC = accentColor;

  // ── Corner ornament (L-bracket + diamond tip) ───────────────────────
  const Corner = ({ flip }: { flip: string }) => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={{ display: "block", transform: flip || undefined }}
    >
      {/* dark fill behind */}
      <polygon points="12,0 24,0 24,4 4,4 4,24 0,24 0,0" fill="#0d0803" />
      {/* dark gold ring */}
      <polygon points="12,1 23,1 23,4 4,4 4,23 1,23 1,1" fill="#5a3c10" />
      {/* accent gold ring */}
      <polygon points="12,2.5 21,2.5 21,4 4,4 4,21 2.5,21 2.5,2.5" fill={AC} opacity="0.9" />
      {/* diamond at corner */}
      <polygon points="12,0 14.5,2.5 12,5 9.5,2.5" fill={AC} />
    </svg>
  );

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: size === "sm" ? 6 : 10, userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* ── ORNATE FRAME ───────────────────────────────────── */}
      <div style={{ position: "relative" }}>

        {/* Drag zone + interior */}
        <div
          onPointerDown={onPD}
          onPointerMove={onPM}
          onPointerUp={onPU}
          onPointerLeave={onPU}
          style={{
            width: d.fw,
            height: d.fh,
            background: "linear-gradient(180deg, #090d1c 0%, #060910 100%)",
            cursor: "ew-resize",
            position: "relative",
            overflow: "hidden",
            // Multi-ring border mimicking Seal Online stone frame
            outline: "1px solid #1e1206",
            boxShadow: [
              `0 0 0 3px #3a2608`,
              `0 0 0 5px ${AC}`,
              `0 0 0 6px #261808`,
              `0 0 0 8px #5a3c10`,
              `0 0 0 9px #120a02`,
              `inset 0 0 0 1px rgba(200,164,74,0.10)`,
              `inset 0 0 50px rgba(0,0,0,0.78)`,
              `0 16px 48px rgba(0,0,0,0.7)`,
            ].join(", "),
          }}
        >
          {/* Subtle scanlines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              pointerEvents: "none",
              backgroundImage:
                "repeating-linear-gradient(to bottom,transparent 0px,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)",
            }}
          />

          {/* Vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 9,
              pointerEvents: "none",
              background: "radial-gradient(ellipse at 50% 38%, transparent 28%, rgba(0,0,0,0.62) 100%)",
            }}
          />

          {/* Accent ambient glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 8,
              pointerEvents: "none",
              background: `radial-gradient(ellipse at 50% 65%, ${AC}0c 0%, transparent 58%)`,
            }}
          />

          {/* Ground glow ellipse */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: d.fw * 0.55,
              height: 12,
              borderRadius: "50%",
              background: `radial-gradient(ellipse, ${AC}55 0%, transparent 70%)`,
              filter: "blur(5px)",
              zIndex: 3,
            }}
          />
          {/* Ground shadow */}
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: "50%",
              transform: "translateX(-50%)",
              width: d.fw * 0.38,
              height: 6,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              filter: "blur(6px)",
              zIndex: 3,
            }}
          />

          {/* Character sprite with bob + fade */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 12,
              zIndex: 5,
            }}
          >
            <div
              style={{
                transform: `translateY(${bobY}px)`,
                opacity: fading ? 0 : 1,
                transition: `opacity 0.10s ${fading ? "ease-out" : "ease-in"}`,
                filter: `drop-shadow(0 10px 20px rgba(0,0,0,0.88)) drop-shadow(0 0 14px ${AC}18)`,
              }}
            >
              <svg
                viewBox="0 0 200 245"
                width={d.sw}
                height={d.sh}
                dangerouslySetInnerHTML={{ __html: `<g>${frames[shown] ?? frames[0]}</g>` }}
              />
            </div>
          </div>

          {/* Top shimmer line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              zIndex: 11,
              background: `linear-gradient(90deg, transparent, ${AC}aa 30%, ${AC}dd 50%, ${AC}aa 70%, transparent)`,
            }}
          />

          {/* ‹ › arrow buttons */}
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                interact();
                onAngleChange(((angle + dir) % 8 + 8) % 8);
              }}
              style={{
                position: "absolute",
                [dir === -1 ? "left" : "right"]: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 22,
                height: 30,
                background: "linear-gradient(180deg, rgba(22,14,4,0.92), rgba(10,6,0,0.92))",
                border: `1px solid ${AC}55`,
                borderRadius: 3,
                color: AC,
                fontSize: 17,
                fontWeight: "bold",
                cursor: "pointer",
                zIndex: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                boxShadow: `0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 ${AC}22`,
              }}
            >
              {dir === -1 ? "‹" : "›"}
            </button>
          ))}
        </div>

        {/* ── Corner ornaments (outside frame, cover the border stack) ── */}
        <div style={{ position: "absolute", top: -9, left: -9, zIndex: 20 }}>
          <Corner flip="" />
        </div>
        <div style={{ position: "absolute", top: -9, right: -9, zIndex: 20 }}>
          <Corner flip="scaleX(-1)" />
        </div>
        <div style={{ position: "absolute", bottom: -9, left: -9, zIndex: 20 }}>
          <Corner flip="scaleY(-1)" />
        </div>
        <div style={{ position: "absolute", bottom: -9, right: -9, zIndex: 20 }}>
          <Corner flip="scale(-1)" />
        </div>

        {/* ── Nameplate ── */}
        {name && (
          <div
            style={{
              position: "absolute",
              bottom: -17,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 15,
              background: `linear-gradient(90deg, transparent, #130c02 14%, #130c02 86%, transparent)`,
              border: `1px solid ${AC}55`,
              borderTop: "none",
              padding: "3px 20px 4px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                color: AC,
                fontSize: 10,
                fontWeight: "bold",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textShadow: `0 0 10px ${AC}77`,
              }}
            >
              {name}
            </span>
          </div>
        )}
      </div>

      {/* ── Direction dots ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          marginTop: name ? 18 : 4,
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              interact();
              onAngleChange(i);
            }}
            style={{
              width: i === angle ? 16 : 6,
              height: 6,
              borderRadius: 3,
              padding: 0,
              border: "none",
              background: i === angle ? AC : "rgba(255,255,255,0.18)",
              boxShadow: i === angle ? `0 0 6px ${AC}` : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>

      {/* ── Direction label ── */}
      <span
        style={{
          fontSize: 9,
          color: `${AC}99`,
          fontWeight: "bold",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {DIR_LABELS[angle]}
      </span>
    </div>
  );
}

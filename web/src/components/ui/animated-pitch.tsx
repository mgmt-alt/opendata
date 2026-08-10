import { motion } from "framer-motion";

/** Positions loosely modelled on a broadcast tracking frame (percent units). */
const home = [
  { x: 16, y: 50 },
  { x: 30, y: 26 },
  { x: 30, y: 74 },
  { x: 46, y: 40 },
  { x: 46, y: 62 },
  { x: 62, y: 50 },
];
const away = [
  { x: 84, y: 50 },
  { x: 70, y: 30 },
  { x: 70, y: 70 },
  { x: 55, y: 45 },
  { x: 55, y: 58 },
  { x: 40, y: 50 },
];

function jitter(seed: number) {
  return {
    x: [0, Math.sin(seed) * 4, Math.cos(seed) * 3, 0],
    y: [0, Math.cos(seed) * 3, Math.sin(seed) * 4, 0],
  };
}

/**
 * A stylised, always-on tracking frame: two teams and a ball drifting the way
 * extrapolated broadcast tracking data does. Pure decoration, aria-hidden.
 */
export function AnimatedPitch() {
  return (
    <div
      aria-hidden
      className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-primary/[0.07] to-accent/[0.05]"
    >
      {/* Pitch markings */}
      <svg
        viewBox="0 0 160 100"
        className="absolute inset-0 h-full w-full text-primary/25"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <rect x="4" y="4" width="152" height="92" rx="2" />
        <line x1="80" y1="4" x2="80" y2="96" />
        <circle cx="80" cy="50" r="12" />
        <circle cx="80" cy="50" r="1" fill="currentColor" />
        <rect x="4" y="28" width="20" height="44" />
        <rect x="136" y="28" width="20" height="44" />
        <rect x="4" y="40" width="8" height="20" />
        <rect x="148" y="40" width="8" height="20" />
      </svg>

      {/* Players */}
      {home.map((p, i) => (
        <motion.span
          key={`h-${i}`}
          className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px] shadow-primary/60 ring-2 ring-background"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={jitter(i + 1)}
          transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {away.map((p, i) => (
        <motion.span
          key={`a-${i}`}
          className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 ring-2 ring-background"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={jitter(i + 6)}
          transition={{ duration: 5 + i * 0.35, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Ball travelling between the lines */}
      <motion.span
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_14px] shadow-accent"
        style={{ left: "50%", top: "50%" }}
        animate={{
          left: ["50%", "62%", "46%", "55%", "50%"],
          top: ["50%", "40%", "62%", "48%", "50%"],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Live frame chip */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        10&nbsp;fps · extrapolated
      </div>
    </div>
  );
}

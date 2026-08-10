import * as React from "react";
import { animate, useInView } from "framer-motion";

interface Stat {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

const stats: Stat[] = [
  { label: "Matches tracked", value: 10 },
  { label: "Frames per second", value: 10, suffix: " fps" },
  { label: "Player-ID accuracy", value: 97, suffix: "%" },
  { label: "Aggregate metric families", value: 3 },
];

function Counter({ to, suffix, prefix }: { to: number; suffix?: string; prefix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {Math.round(val)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="border-y border-border bg-secondary/30">
      <div className="container grid grid-cols-2 gap-y-10 py-14 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
              <Counter to={s.value} suffix={s.suffix} prefix={s.prefix} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

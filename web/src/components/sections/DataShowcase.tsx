import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileJson, Table2, Braces } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

type TabKey = "tracking" | "events" | "match";

const tabs: { key: TabKey; label: string; icon: React.ElementType; file: string }[] = [
  { key: "tracking", label: "Tracking", icon: Braces, file: "{id}_tracking_extrapolated.jsonl" },
  { key: "events", label: "Dynamic events", icon: Table2, file: "{id}_dynamic_events.csv" },
  { key: "match", label: "Match meta", icon: FileJson, file: "{id}_match.json" },
];

const snippets: Record<TabKey, string> = {
  tracking: `{
  "frame": 4213,
  "timestamp": 421.3,
  "period": 1,
  "possession": { "player_id": 8817, "group": "home" },
  "ball_data": { "x": 3.42, "y": -1.10 },
  "player_data": [
    { "player_id": 8817, "x": 4.10, "y": -0.92, "is_detected": true },
    { "player_id": 9042, "x": -2.31, "y": 6.05, "is_detected": false }
  ]
}`,
  events: `event_id,type,sub_category,player_id,x,y,start_frame
1042,pass,build_up,8817,0.42,-0.11,4210
1043,carry,progression,9042,-0.23,0.60,4231
1044,shot,chance,8817,0.88,0.04,4267`,
  match: `{
  "id": "1553748",
  "home_team": "Melbourne City",
  "away_team": "Sydney FC",
  "pitch_length": 105,
  "pitch_width": 68,
  "referee": "…",
  "lineups": [ /* players, positions, minutes */ ]
}`,
};

export function DataShowcase() {
  const [active, setActive] = React.useState<TabKey>("tracking");

  return (
    <section id="data" className="scroll-mt-20 py-24">
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Data structure
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Formats you already know how to parse
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each match ships as a small set of files — line-delimited JSON for
            tracking, plain CSV for events and phases, and JSON for match metadata.
            Pick a match <code className="rounded bg-secondary px-1.5 py-0.5 text-sm text-foreground">id</code>{" "}
            from <code className="rounded bg-secondary px-1.5 py-0.5 text-sm text-foreground">matches.json</code>{" "}
            and load only what you need.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                  active === t.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal index={1}>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
              <span className="size-3 rounded-full bg-destructive/70" />
              <span className="size-3 rounded-full bg-amber-400/70" />
              <span className="size-3 rounded-full bg-primary/70" />
              <span className="ml-3 truncate font-mono text-xs text-muted-foreground">
                {tabs.find((t) => t.key === active)?.file}
              </span>
            </div>
            <div className="relative overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="p-5 font-mono text-[13px] leading-relaxed text-foreground/90"
                >
                  <code>{snippets[active]}</code>
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

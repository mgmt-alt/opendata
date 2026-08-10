import {
  Activity,
  Radar,
  Route,
  Gauge,
  Layers,
  GitBranch,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

const features = [
  {
    icon: Radar,
    title: "Broadcast tracking",
    desc: "X/Y positions for every player and the ball at 10 fps, extrapolated from broadcast video via computer vision.",
  },
  {
    icon: Activity,
    title: "Dynamic events",
    desc: "Game Intelligence event streams across four sub-categories, keyed per match with contextual metadata.",
  },
  {
    icon: Layers,
    title: "Phases of play",
    desc: "Concurrent in- and out-of-possession phase labels, defined frame-by-frame whenever the ball is in play.",
  },
  {
    icon: Route,
    title: "Off-ball runs",
    desc: "Tactical run typologies and outcomes, aggregated at player-season level for performances over 60 minutes.",
  },
  {
    icon: Gauge,
    title: "Physical metrics",
    desc: "PSV-99, high-intensity counts, and distance covered — the physical profile behind every performance.",
  },
  {
    icon: GitBranch,
    title: "Passing volume",
    desc: "Aggregated passing volume and efficiency, ready to join against tracking and event layers.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            What&apos;s inside
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Six data layers, one coordinate system
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything is modelled in meters from the center of the pitch, so the
            tracking, events, and aggregate layers line up out of the box.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} index={i}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-2 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="size-5" />
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {f.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";

const paths = [
  {
    n: "01",
    title: "Getting Started with SkillCorner Data",
    desc: "Foundational performance data and basic normalization workflows.",
    tag: "Foundations",
  },
  {
    n: "02",
    title: "Working with Game Intelligence",
    desc: "Dynamic events, phases of play, off-ball runs, animations, and custom metrics.",
    tag: "Contextual layers",
  },
  {
    n: "03",
    title: "Basics of Tracking",
    desc: "Working directly with raw X/Y coordinates and spatial data formats.",
    tag: "Spatial",
  },
  {
    n: "04",
    title: "Visualization Bank",
    desc: "Innovative, fun visualizations built on top of the tracking layer.",
    tag: "Dataviz",
  },
];

export function Tutorials() {
  return (
    <section id="tutorials" className="scroll-mt-20 py-24">
      <div className="container">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Learning paths
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Four notebooks, start to shipping
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Tutorials are organised as guided paths in{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-sm text-foreground">
              notebooks/tutorials
            </code>
            , plus reusable loaders in{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-sm text-foreground">
              src/
            </code>
            .
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {paths.map((p, i) => (
            <Reveal key={p.n} index={i}>
              <Card className="group relative h-full overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <div
                  className="pointer-events-none absolute -right-6 -top-8 text-[8rem] font-extrabold leading-none text-primary/[0.06] transition-transform duration-500 group-hover:scale-110"
                  aria-hidden
                >
                  {p.n}
                </div>
                <CardContent className="relative flex h-full flex-col gap-3 p-6">
                  <Badge variant="secondary" className="w-fit">
                    Path {p.n}
                  </Badge>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                  <div className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
                    Open notebook
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

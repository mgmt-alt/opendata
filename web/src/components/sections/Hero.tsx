import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedPitch } from "@/components/ui/animated-pitch";
import { REPO_URL } from "@/components/sections/Navbar";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="pitch-grid absolute inset-0 -z-10" aria-hidden />
      <div
        className="absolute left-1/2 top-0 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]"
        aria-hidden
      />

      <div className="container grid items-center gap-14 lg:grid-cols-2">
        <motion.div variants={container} initial="hidden" animate="visible">
          <motion.div variants={item}>
            <Badge variant="accent" className="gap-1.5 py-1">
              <Sparkles className="size-3" />
              10 matches · A-League 2024/25 · open sourced
            </Badge>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
          >
            Broadcast tracking data,{" "}
            <span className="text-gradient animate-gradient-pan">free for everyone</span>.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground"
          >
            Player &amp; ball positions extracted from broadcast video with computer
            vision — plus derived dynamic events, phases of play, and season-level
            aggregates. Built with{" "}
            <a
              href="https://pysport.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              PySport
            </a>{" "}
            for the analytics community.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                Explore the data <ArrowRight />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#tutorials">
                <BookOpen /> Read the tutorials
              </a>
            </Button>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" /> ~97% player-ID accuracy
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent" /> JSON · JSONL · CSV
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" /> MIT-friendly access
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative"
        >
          <div className="animate-float">
            <AnimatedPitch />
          </div>
          <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-border bg-card/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
            <p className="text-2xl font-bold tabular-nums text-primary">22</p>
            <p className="text-xs text-muted-foreground">players tracked / frame</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

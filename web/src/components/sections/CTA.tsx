import { Github, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { REPO_URL } from "@/components/sections/Navbar";

export function CTA() {
  return (
    <section id="about" className="scroll-mt-20 py-24">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 px-6 py-16 text-center md:px-16">
            <div
              className="absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
              aria-hidden
            >
              <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px] animate-float" />
            </div>

            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight md:text-5xl">
              Build something with the data
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground md:text-lg">
              Open sourced by SkillCorner and PySport for researchers and the
              analytics community. Credit SkillCorner if you use it — and tell us
              what you build.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <Github /> Get the repo
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://skillcorner.com/#contact-section" target="_blank" rel="noreferrer">
                  <MessageCircle /> Contact SkillCorner
                </a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

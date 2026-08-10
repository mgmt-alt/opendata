import * as React from "react";
import { motion } from "framer-motion";
import { Github, Menu, X, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { label: "Data", href: "#data" },
  { label: "Features", href: "#features" },
  { label: "Tutorials", href: "#tutorials" },
  { label: "About", href: "#about" },
];

const REPO_URL = "https://github.com/skillcorner/opendata";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <nav className="container flex h-16 items-center justify-between">
        <a href="#top" className="group flex items-center gap-2.5 font-bold">
          <span className="relative grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Radar className="size-5 transition-transform duration-500 group-hover:rotate-180" />
          </span>
          <span className="text-[15px] tracking-tight">
            SkillCorner<span className="text-muted-foreground"> / OpenData</span>
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Github /> Star
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
        >
          <div className="container flex flex-col py-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

export { REPO_URL };

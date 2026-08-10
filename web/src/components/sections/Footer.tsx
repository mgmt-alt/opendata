import { Github, Twitter, Radar } from "lucide-react";
import { REPO_URL } from "@/components/sections/Navbar";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2.5 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Radar className="size-4" />
          </span>
          SkillCorner <span className="text-muted-foreground">/ OpenData</span>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Data © SkillCorner · open sourced with{" "}
          <a
            href="https://pysport.org"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            PySport
          </a>
          . A-League 2024/25 sample.
        </p>

        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Github className="size-4" />
          </a>
          <a
            href="https://twitter.com/skillcorner"
            target="_blank"
            rel="noreferrer"
            aria-label="SkillCorner on Twitter"
            className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Twitter className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

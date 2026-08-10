# SkillCorner Open Data — Animated Portfolio

An animated, single-page showcase site for the **SkillCorner Open Data** project.
Built with React + Vite, styled with **shadcn/ui design tokens**, and animated with
**Tailwind motion primitives** (`tailwindcss-animate`) plus [Framer Motion](https://www.framer.com/motion/)
micro-animations.

![Hero preview](../assets/field.jpg)

## Stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | React 18 + TypeScript                              |
| Build tool         | Vite 6                                             |
| Styling            | Tailwind CSS 3 with shadcn/ui HSL design tokens    |
| Components         | shadcn/ui-style primitives (`Button`, `Card`, `Badge`) built with `class-variance-authority` |
| Motion (primitives)| `tailwindcss-animate` + custom keyframes (`fade-up`, `float`, `gradient-pan`, `pulse-ring`) |
| Motion (micro)     | Framer Motion (scroll reveals, count-ups, tab transitions, scroll progress) |
| Icons              | `lucide-react`                                     |

## Design tokens

The shadcn/ui token layer lives in [`src/index.css`](src/index.css) as HSL channel
triplets on `:root` and `.dark`, and is wired into Tailwind utilities in
[`tailwind.config.js`](tailwind.config.js). Dark mode is the default and can be
toggled from the navbar (persisted to `localStorage`). Everything honours
`prefers-reduced-motion`.

## Sections

- **Hero** — animated broadcast-tracking "frame" (players + ball drifting), gradient headline, floating stat card.
- **Stats** — scroll-triggered count-up figures.
- **Features** — the six data layers (tracking, dynamic events, phases of play, off-ball runs, physical, passing).
- **Data structure** — animated tabs previewing the tracking / events / match file formats.
- **Tutorials** — the four learning paths from `notebooks/tutorials`.
- **CTA + Footer** — links back to the repo and SkillCorner.

## Getting started

```bash
cd web
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Structure

```
web/
├── index.html
├── tailwind.config.js        # shadcn/ui tokens + motion keyframes
├── src/
│   ├── index.css             # design-token layer + utilities
│   ├── App.tsx               # page composition
│   ├── lib/utils.ts          # cn() class merger
│   ├── components/ui/        # shadcn-style primitives + animation helpers
│   └── components/sections/  # page sections
```

> The content is a showcase for the open data in this repository; swap in your own
> copy and links to reuse it as a general portfolio template.

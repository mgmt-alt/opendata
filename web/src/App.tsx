import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { Features } from "@/components/sections/Features";
import { DataShowcase } from "@/components/sections/DataShowcase";
import { Tutorials } from "@/components/sections/Tutorials";
import { CTA } from "@/components/sections/CTA";
import { Footer } from "@/components/sections/Footer";
import { ScrollProgress } from "@/components/ui/scroll-progress";

export default function App() {
  return (
    <div className="relative min-h-screen">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <DataShowcase />
        <Tutorials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

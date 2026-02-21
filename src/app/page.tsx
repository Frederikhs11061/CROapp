import type { Metadata } from "next";
import {
  Zap,
  BarChart3,
  Target,
  Brain,
} from "lucide-react";
import URLInputForm from "@/components/URLInputForm";

export const metadata: Metadata = {
  title: "CRO Audit Tool – Gratis AI Konverteringsanalyse",
  description:
    "Analysér din webshop gratis med AI. Få CRO-anbefalinger baseret på 400+ dokumenterede tiltag. Scanner i under 60 sek.",
  alternates: {
    canonical: "/",
  },
};

import AnalysisGrid from "@/components/AnalysisGrid";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Target,
    title: "Indsæt din URL",
    description:
      "Kopier linket til den side du vil analysere – forside, produktside, checkout eller landingsside.",
  },
  {
    step: "02",
    icon: Brain,
    title: "AI analyserer",
    description:
      "Vores AI scanner dit site, tager screenshots og evaluerer mod 400+ CRO-principper.",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "Få din rapport",
    description:
      "Modtag en detaljeret rapport med scores, konkrete anbefalinger og prioriterede quick wins.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="pt-20 sm:pt-24" id="main-content">
      {/* Hero */}
      <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center px-4 sm:px-6 overflow-hidden" aria-labelledby="hero-heading">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[600px] bg-orange-500/8 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
            AI-drevet CRO-analyse baseret på 400+ tiltag
          </div>

          <h1 id="hero-heading" className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6">
            Find de skjulte{" "}
            <span className="gradient-text">konverteringsfejl</span> på din
            hjemmeside
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-neutral-400 max-w-2xl mx-auto mb-6 sm:mb-12 leading-relaxed">
            Indsæt din URL og få en komplet CRO-analyse på under 60 sekunder.
            Vi scanner dit site mod 400+ dokumenterede konverteringsprincipper
            og giver dig konkrete anbefalinger.
          </p>

          <URLInputForm />
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 sm:py-24 px-4 sm:px-6" aria-labelledby="how-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 sm:mb-16">
            <h2 id="how-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Sådan virker det
            </h2>
            <p className="text-neutral-400 text-sm sm:text-lg">
              Tre simple trin til en komplet CRO-rapport
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {HOW_IT_WORKS.map((item) => (
              <article
                key={item.step}
                className="glass-card rounded-2xl p-5 sm:p-8 relative group hover:border-orange-500/20 transition-all"
              >
                <span className="absolute top-4 right-4 sm:top-6 sm:right-6 text-4xl sm:text-6xl font-black gradient-text opacity-40" aria-hidden="true">
                  {item.step}
                </span>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 sm:mb-5">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What we analyze */}
      <section className="py-10 sm:py-24 px-4 sm:px-6 border-t border-white/5" aria-labelledby="analyze-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 sm:mb-16">
            <h2 id="analyze-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Hvad vi analyserer
            </h2>
            <p className="text-neutral-400 text-sm sm:text-lg">
              Baseret på de 11 Love for Sales Funnel Physics og 313+ A/B-testede case studies
            </p>
          </div>

          <AnalysisGrid />
        </div>
      </section>
    </main>
  );
}

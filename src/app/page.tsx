"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Monitor,
  Smartphone,
  Zap,
  Shield,
  BarChart3,
  Target,
  Eye,
  Brain,
} from "lucide-react";
import Header from "@/components/Header";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), viewport }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analyse fejlede");
      }

      sessionStorage.setItem("cro-analysis", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Noget gik galt. Prøv igen."
      );
      setIsLoading(false);
    }
  }

  if (isLoading) {
    const AnalysisLoader =
      require("@/components/AnalysisLoader").default;
    return (
      <>
        <Header />
        <main className="pt-16">
          <AnalysisLoader />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="relative min-h-[85vh] flex items-center justify-center px-6 overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/8 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              AI-drevet CRO-analyse baseret på 400+ tiltag
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              Find de skjulte{" "}
              <span className="gradient-text">konverteringsfejl</span> på din
              hjemmeside
            </h1>

            <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Indsæt din URL og få en komplet CRO-analyse på under 60 sekunder.
              Vi scanner dit site mod 400+ dokumenterede konverteringsprincipper
              og giver dig konkrete anbefalinger.
            </p>

            {/* URL Input */}
            <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto">
              <div className="glass-card rounded-2xl p-2 border border-white/10 focus-within:border-orange-500/40 transition-colors">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4">
                    <Globe className="w-5 h-5 text-neutral-500 shrink-0" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Indsæt din URL her... f.eks. www.dinwebshop.dk"
                      className="flex-1 bg-transparent border-none text-base py-3 placeholder:text-neutral-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!url.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-semibold text-white hover:from-orange-400 hover:to-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Analysér
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewport toggle */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setViewport("desktop")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    viewport === "desktop"
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setViewport("mobile")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    viewport === "mobile"
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobil
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Sådan virker det
              </h2>
              <p className="text-neutral-400 text-lg">
                Tre simple trin til en komplet CRO-rapport
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
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
                    "Vores AI scanner dit site med Puppeteer, tager screenshots og evaluerer mod 400+ CRO-principper.",
                },
                {
                  step: "03",
                  icon: BarChart3,
                  title: "Få din rapport",
                  description:
                    "Modtag en detaljeret rapport med scores, konkrete anbefalinger og prioriterede quick wins.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="glass-card rounded-2xl p-8 relative group hover:border-orange-500/20 transition-all"
                >
                  <span className="absolute top-6 right-6 text-6xl font-black text-white/3">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-5">
                    <item.icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we analyze */}
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Hvad vi analyserer
              </h2>
              <p className="text-neutral-400 text-lg">
                Baseret på de 11 Love for Sales Funnel Physics og 313+ A/B-testede case studies
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Eye, label: "Above the Fold", desc: "Headlines, hero, første indtryk" },
                { icon: Target, label: "Call to Action", desc: "Placering, kontrast, tekst" },
                { icon: Shield, label: "Social Proof & Tillid", desc: "Reviews, badges, garantier" },
                { icon: "✍️", label: "Copywriting", desc: "Klarhed, benefits, USP" },
                { icon: "🧭", label: "Navigation", desc: "Struktur, hierarki, flow" },
                { icon: "🎨", label: "Design & UX", desc: "Layout, farver, typografi" },
                { icon: "📱", label: "Mobil & Speed", desc: "Responsivitet, load tid" },
                { icon: "💰", label: "Konvertering", desc: "Priser, urgency, scarcity" },
                { icon: "🚧", label: "Friktion", desc: "Barrierer, distraktioner" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 rounded-xl glass-card hover:border-orange-500/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    {typeof item.icon === "string" ? (
                      <span className="text-lg">{item.icon}</span>
                    ) : (
                      <item.icon className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-neutral-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto text-center text-sm text-neutral-600">
            CRO Audit Tool – Bygget med data fra 400+ dokumenterede CRO-tiltag
          </div>
        </footer>
      </main>
    </>
  );
}

function Globe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ExternalLink,
  Zap,
  TrendingUp,
  Clock,
  FlaskConical,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ScoreRing from "@/components/ScoreRing";
import type { AnalysisResult } from "@/lib/cro-knowledge";

const CategorySection = dynamic(
  () => import("@/components/CategorySection"),
  { ssr: false }
);

type AnalysisData = {
  analysis: AnalysisResult;
  screenshot: string;
  url: string;
  scrapedAt: string;
};

function getScoreLabel(score: number) {
  if (score >= 80) return "Stærk";
  if (score >= 60) return "Acceptabel";
  if (score >= 40) return "Behøver forbedring";
  return "Kritisk";
}

export default function ResultsClient() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "category" | "actions" | "ab-tests" | "benchmark"
  >("overview");
  const [categoryIndex, setCategoryIndex] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("cro-analysis");
    if (!stored) {
      router.push("/");
      return;
    }
    setData(JSON.parse(stored));
  }, [router]);

  if (!data) return null;

  const { analysis, screenshot, url } = data;
  const totalFindings = analysis.categories.reduce(
    (acc, c) => acc + c.findings.length,
    0
  );
  const errorCount = analysis.categories.reduce(
    (acc, c) => acc + c.findings.filter((f) => f.type === "error").length,
    0
  );
  const warningCount = analysis.categories.reduce(
    (acc, c) => acc + c.findings.filter((f) => f.type === "warning").length,
    0
  );
  const successCount = analysis.categories.reduce(
    (acc, c) => acc + c.findings.filter((f) => f.type === "success").length,
    0
  );

  return (
    <main className="pt-20 pb-24 px-6" id="main-content">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs + top bar */}
        <div className="mb-6">
          <Breadcrumbs items={[{ label: "Analyserapport", href: "/results" }]} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Ny analyse
            </button>
            <div className="h-4 w-px bg-white/10" aria-hidden="true" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-orange-400 transition-colors truncate max-w-sm"
            >
              {url}
              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <time dateTime={data.scrapedAt}>
              Analyseret: {new Date(data.scrapedAt).toLocaleString("da-DK")}
            </time>
          </div>
        </div>

        {/* Score hero – shows category score when viewing a category */}
        {activeTab === "category" ? (() => {
          const cat = analysis.categories[categoryIndex];
          if (!cat) return null;
          const catErrors = cat.findings.filter((f) => f.type === "error").length;
          const catWarnings = cat.findings.filter((f) => f.type === "warning").length;
          const catSuccess = cat.findings.filter((f) => f.type === "success").length;

          return (
            <section className="glass-card rounded-2xl p-5 sm:p-6 mb-6" aria-labelledby="score-heading">
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <ScoreRing score={cat.score} size={110} strokeWidth={8} />
                  <p className="mt-2 text-sm font-bold">{getScoreLabel(cat.score)}</p>
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <h1 id="score-heading" className="text-lg sm:text-xl font-bold mb-1 flex items-center justify-center lg:justify-start gap-2">
                    <span>{cat.icon}</span> {cat.name}
                  </h1>
                  <p className="text-[11px] text-neutral-400 mb-3">
                    {categoryIndex + 1} af {analysis.categories.length} kategorier · Samlet score: {analysis.overallScore}/100
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                      <span className="text-sm font-bold">{cat.findings.length}</span>
                      <span className="text-[11px] text-neutral-400">fund</span>
                    </div>
                    {catErrors > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10">
                        <span className="text-sm font-bold text-red-400">{catErrors}</span>
                        <span className="text-[11px] text-neutral-400">kritiske</span>
                      </div>
                    )}
                    {catWarnings > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10">
                        <span className="text-sm font-bold text-yellow-400">{catWarnings}</span>
                        <span className="text-[11px] text-neutral-400">advarsler</span>
                      </div>
                    )}
                    {catSuccess > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10">
                        <span className="text-sm font-bold text-green-400">{catSuccess}</span>
                        <span className="text-[11px] text-neutral-400">bestået</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })() : (
          <section className="glass-card rounded-2xl p-5 sm:p-6 mb-6" aria-labelledby="score-heading">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex flex-col items-center">
                <ScoreRing score={analysis.overallScore} size={110} strokeWidth={8} />
                <p className="mt-2 text-sm font-bold">{getScoreLabel(analysis.overallScore)}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Sidetype: {analysis.pageType}</p>
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h1 id="score-heading" className="text-lg sm:text-xl font-bold mb-2">CRO-analyserapport</h1>
                <p className="text-neutral-300 text-sm leading-relaxed mb-4">{analysis.summary}</p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2" role="list" aria-label="Analyse-statistik">
                  <div role="listitem" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                    <span className="text-sm font-bold">{totalFindings}</span>
                    <span className="text-[11px] text-neutral-400">fund</span>
                  </div>
                  <div role="listitem" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10">
                    <span className="text-sm font-bold text-red-400">{errorCount}</span>
                    <span className="text-[11px] text-neutral-400">kritiske</span>
                  </div>
                  <div role="listitem" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10">
                    <span className="text-sm font-bold text-yellow-400">{warningCount}</span>
                    <span className="text-[11px] text-neutral-400">advarsler</span>
                  </div>
                  <div role="listitem" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10">
                    <span className="text-sm font-bold text-green-400">{successCount}</span>
                    <span className="text-[11px] text-neutral-400">bestået</span>
                  </div>
                </div>
              </div>
              {screenshot && (
                <div className="shrink-0 hidden xl:block">
                  <div className="w-48 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshot} alt={`Screenshot af ${url}`} className="w-full" loading="lazy" />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab navigation */}
        <nav aria-label="Rapport-sektioner" className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {([
            { key: "overview" as const, icon: TrendingUp, label: "Overblik" },
            { key: "actions" as const, icon: Zap, label: "Quick Wins" },
            { key: "ab-tests" as const, icon: FlaskConical, label: "A/B Test-idéer" },
            { key: "benchmark" as const, icon: BarChart3, label: "Benchmark" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top critical errors summary */}
            {errorCount > 0 && (
              <section className="glass-card rounded-xl p-5" aria-labelledby="critical-summary">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                  <h2 id="critical-summary" className="text-sm font-bold text-red-400">
                    {errorCount} kritisk{errorCount !== 1 ? "e" : ""} problem{errorCount !== 1 ? "er" : ""} fundet
                  </h2>
                </div>
                <div className="space-y-2">
                  {analysis.categories
                    .flatMap((c) => c.findings)
                    .filter((fi) => fi.type === "error")
                    .slice(0, 5)
                    .map((fi, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-red-400 mt-0.5 shrink-0">●</span>
                        <span className="text-neutral-300">{fi.title} – <span className="text-neutral-500">{fi.description.slice(0, 80)}{fi.description.length > 80 ? "…" : ""}</span></span>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Category grid (click navigates to detail view) */}
            <section aria-label="Kategori-scores">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.categories.map((cat) => {
                  const errors = cat.findings.filter((fi) => fi.type === "error").length;
                  const warnings = cat.findings.filter((fi) => fi.type === "warning").length;

                  return (
                    <article
                      key={cat.name}
                      className="glass-card rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-orange-500/20 transition-all group"
                      onClick={() => { setCategoryIndex(analysis.categories.indexOf(cat)); setActiveTab("category"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    >
                      <ScoreRing score={cat.score} size={56} strokeWidth={4} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true">{cat.icon}</span>
                          <h3 className="font-semibold text-sm">{cat.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-500">{cat.findings.length} fund</span>
                          {errors > 0 && <span className="text-[10px] text-red-400">{errors} fejl</span>}
                          {warnings > 0 && <span className="text-[10px] text-yellow-400">{warnings} advarsler</span>}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-400 shrink-0 transition-colors" />
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="glass-card rounded-xl p-5" aria-labelledby="actions-heading">
              <h2 id="actions-heading" className="text-sm font-bold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" aria-hidden="true" />
                Top 5 prioriterede handlinger
              </h2>
              <ol className="space-y-2">
                {analysis.prioritizedActions.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-orange-400" aria-hidden="true">
                      {i + 1}
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed pt-0.5">
                      {action}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {screenshot && (
              <section className="glass-card rounded-xl p-5" aria-label="Screenshot">
                <h2 className="text-sm font-bold mb-3">
                  Screenshot (Above the Fold)
                </h2>
                <div className="rounded-lg overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot}
                    alt={`Fuld screenshot af ${url} – above the fold`}
                    className="w-full"
                    loading="lazy"
                  />
                </div>
              </section>
            )}
          </div>
        )}

        {/* Single category detail view */}
        {activeTab === "category" && (() => {
          const cat = analysis.categories[categoryIndex];
          if (!cat) return null;
          const prev = categoryIndex > 0 ? analysis.categories[categoryIndex - 1] : null;
          const next = categoryIndex < analysis.categories.length - 1 ? analysis.categories[categoryIndex + 1] : null;

          return (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab("overview")}
                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Tilbage til overblik
              </button>

              <nav className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" aria-label="Kategorier">
                {analysis.categories.map((c, i) => (
                  <button
                    key={c.name}
                    onClick={() => { setCategoryIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      i === categoryIndex
                        ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                        : "text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <span className="text-[11px]">{c.icon}</span>
                    <span className="hidden sm:inline">{c.name}</span>
                    <span className="sm:hidden">{c.name.split(" ")[0]}</span>
                    <span className={`text-[10px] ml-0.5 ${
                      i === categoryIndex ? "text-orange-400/70" : "text-neutral-600"
                    }`}>{c.score}</span>
                  </button>
                ))}
              </nav>

              <CategorySection category={cat} />
            </div>
          );
        })()}

        {/* Quick Wins */}
        {activeTab === "actions" && (
          <div className="space-y-6">
            <section className="glass-card rounded-2xl p-8" aria-labelledby="quickwins-heading">
              <h2 id="quickwins-heading" className="text-xl font-bold mb-2 flex items-center gap-3">
                <Zap className="w-5 h-5 text-orange-400" aria-hidden="true" />
                Quick Wins
              </h2>
              <p className="text-neutral-400 text-sm mb-6">
                Disse ændringer kan implementeres hurtigt og har dokumenteret
                effekt på konverteringsraten.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {analysis.quickWins.map((win, i) => (
                  <article
                    key={i}
                    className="p-5 rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-orange-400" aria-hidden="true" />
                      <h3 className="font-semibold text-sm">{win.title}</h3>
                    </div>
                    <p className="text-sm text-neutral-300 mb-3">
                      {win.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-3 h-3 text-green-400" aria-hidden="true" />
                      <span className="text-green-400">
                        {win.estimatedImpact}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-2xl p-8" aria-labelledby="all-actions-heading">
              <h2 id="all-actions-heading" className="text-xl font-bold mb-6">
                Alle prioriterede handlinger
              </h2>
              <ol className="space-y-3">
                {analysis.prioritizedActions.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-orange-400" aria-hidden="true">
                      {i + 1}
                    </div>
                    <p className="text-sm text-neutral-200 leading-relaxed pt-1">
                      {action}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="glass-card rounded-2xl p-8" aria-labelledby="critical-heading">
              <h2 id="critical-heading" className="text-xl font-bold mb-6 text-red-400">
                Kritiske problemer at løse først
              </h2>
              <div className="space-y-3">
                {analysis.categories
                  .flatMap((c) => c.findings)
                  .filter((f) => f.type === "error" && f.impact === "high")
                  .map((finding, i) => (
                    <article
                      key={i}
                      className="p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                    >
                      <h3 className="font-semibold text-sm mb-1">
                        {finding.title}
                      </h3>
                      <p className="text-sm text-neutral-400 mb-2">
                        {finding.description}
                      </p>
                      <p className="text-sm text-orange-300">
                        → {finding.recommendation}
                      </p>
                    </article>
                  ))}
                {analysis.categories
                  .flatMap((c) => c.findings)
                  .filter((f) => f.type === "error" && f.impact === "high")
                  .length === 0 && (
                  <p className="text-neutral-500 text-sm">
                    Ingen kritiske problemer med høj impact fundet – godt
                    klaret!
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* A/B Test Ideas */}
        {activeTab === "ab-tests" && analysis.abTestIdeas && (
          <div className="space-y-6">
            <section className="glass-card rounded-2xl p-8" aria-labelledby="ab-heading">
              <div className="flex items-center gap-3 mb-2">
                <FlaskConical className="w-5 h-5 text-purple-400" aria-hidden="true" />
                <h2 id="ab-heading" className="text-xl font-bold">
                  A/B Test-idéer tilpasset din side
                </h2>
              </div>
              <p className="text-neutral-400 text-sm mb-8">
                Baseret på analysen af din {analysis.pageType} har vi udvalgt de mest relevante A/B tests.
                Hver test inkluderer en hypotese, hvad du skal teste, og hvilken metrik du bør måle.
              </p>

              <div className="space-y-4">
                {analysis.abTestIdeas.map((test) => (
                  <article
                    key={test.id}
                    className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-purple-400">
                          {test.id}
                        </div>
                        <h3 className="font-semibold">{test.title}</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                        test.expectedImpact === "high"
                          ? "bg-green-500/15 text-green-400"
                          : test.expectedImpact === "medium"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : "bg-neutral-500/15 text-neutral-400"
                      }`}>
                        {test.expectedImpact === "high" ? "Høj" : test.expectedImpact === "medium" ? "Medium" : "Lav"} impact
                      </span>
                    </div>

                    <p className="text-sm text-neutral-300 mb-4 italic">
                      &ldquo;{test.hypothesis}&rdquo;
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="text-xs text-red-400 font-medium mb-1">Variant A (kontrol)</div>
                        <p className="text-sm text-neutral-300">{test.variantA}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div className="text-xs text-green-400 font-medium mb-1">Variant B (test)</div>
                        <p className="text-sm text-neutral-300">{test.variantB}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>Mål: <span className="text-neutral-300">{test.metric}</span></span>
                      <span className="text-white/10">|</span>
                      <span>Kategori: <span className="text-neutral-300">{test.category}</span></span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-8 p-5 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <h3 className="font-semibold text-sm mb-2 text-purple-300">Sådan bruger du disse test-idéer</h3>
                <ol className="text-sm text-neutral-400 space-y-1.5 list-decimal list-inside">
                  <li>Vælg 1-2 tests med høj impact at starte med</li>
                  <li>Kør hver test i minimum 2-4 uger eller indtil statistisk signifikans</li>
                  <li>Mål kun den specificerede metrik for at undgå falske positiver</li>
                  <li>Implementer vinderen og gå videre til næste test</li>
                  <li>Test aldrig mere end 1 element ad gangen for klare resultater</li>
                </ol>
              </div>
            </section>
          </div>
        )}

        {/* Benchmark */}
        {activeTab === "benchmark" && analysis.benchmark && (
          <div className="space-y-6">
            <section className="glass-card rounded-2xl p-8" aria-labelledby="bench-heading">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                <h2 id="bench-heading" className="text-xl font-bold">
                  Competitor Benchmarking
                </h2>
              </div>
              <p className="text-neutral-400 text-sm mb-4">
                Sammenlign din sides performance mod branchegennemsnit og top-performere.
              </p>

              <div className="p-5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span className="font-semibold text-sm">Din position</span>
                </div>
                <p className="text-neutral-200">{analysis.benchmark.overallPosition}</p>
                <p className="text-sm text-neutral-400 mt-2">{analysis.benchmark.industryContext}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-neutral-400 font-medium">Kategori</th>
                      <th className="text-center py-3 px-4 text-neutral-400 font-medium">Din score</th>
                      <th className="text-center py-3 px-4 text-neutral-400 font-medium">Branchegennemsnit</th>
                      <th className="text-center py-3 px-4 text-neutral-400 font-medium">Top 10%</th>
                      <th className="text-center py-3 px-4 text-neutral-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.benchmark.comparisons.map((comp) => (
                      <tr key={comp.metric} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-medium">{comp.metric}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${
                            comp.status === "above" ? "text-green-400" : comp.status === "at" ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {comp.yourValue}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-neutral-400">{comp.industryAvg}</td>
                        <td className="py-3 px-4 text-center text-neutral-400">{comp.topPerformers}</td>
                        <td className="py-3 px-4 text-center">
                          {comp.status === "above" ? (
                            <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                              <ArrowUpRight className="w-3 h-3" />
                              Over
                            </span>
                          ) : comp.status === "at" ? (
                            <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-medium">
                              <Minus className="w-3 h-3" />
                              Gennemsnit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                              <ArrowDownRight className="w-3 h-3" />
                              Under
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {analysis.benchmark.comparisons.filter((c) => c.recommendation).length > 0 && (
                <div className="mt-8 space-y-3">
                  <h3 className="font-semibold text-sm text-red-300">Områder under branchegennemsnit</h3>
                  {analysis.benchmark.comparisons
                    .filter((c) => c.recommendation)
                    .map((comp) => (
                      <div key={comp.metric} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <p className="text-sm text-neutral-300">{comp.recommendation}</p>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="glass-card rounded-2xl p-8" aria-labelledby="bench-insights-heading">
              <h2 id="bench-insights-heading" className="text-lg font-bold mb-4">
                Benchmark-indsigter
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {analysis.benchmark.comparisons.filter((c) => c.status === "above").length}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">Over gennemsnit</div>
                </div>
                <div className="p-5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {analysis.benchmark.comparisons.filter((c) => c.status === "at").length}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">På gennemsnit</div>
                </div>
                <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {analysis.benchmark.comparisons.filter((c) => c.status === "below").length}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">Under gennemsnit</div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

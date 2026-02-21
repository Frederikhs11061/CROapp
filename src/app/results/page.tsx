"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Zap,
  ListChecks,
  TrendingUp,
  Clock,
} from "lucide-react";
import Header from "@/components/Header";
import ScoreRing from "@/components/ScoreRing";
import CategorySection from "@/components/CategorySection";
import type { AnalysisResult } from "@/lib/cro-knowledge";

type AnalysisData = {
  analysis: AnalysisResult;
  screenshot: string;
  url: string;
  scrapedAt: string;
};

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "actions">(
    "overview"
  );

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

  function getScoreLabel(score: number) {
    if (score >= 80) return "Stærk";
    if (score >= 60) return "Acceptabel";
    if (score >= 40) return "Behøver forbedring";
    return "Kritisk";
  }

  return (
    <>
      <Header />
      <main className="pt-20 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Ny analyse
              </button>
              <div className="h-4 w-px bg-white/10" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-orange-400 transition-colors truncate max-w-sm"
              >
                {url}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Clock className="w-3 h-3" />
              Analyseret: {new Date(data.scrapedAt).toLocaleString("da-DK")}
            </div>
          </div>

          {/* Score hero */}
          <div className="glass-card rounded-3xl p-8 sm:p-10 mb-8">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              {/* Score */}
              <div className="flex flex-col items-center">
                <ScoreRing
                  score={analysis.overallScore}
                  size={180}
                  strokeWidth={12}
                />
                <p className="mt-3 text-lg font-bold">
                  {getScoreLabel(analysis.overallScore)}
                </p>
                <p className="text-sm text-neutral-400 mt-1">
                  Sidetype: {analysis.pageType}
                </p>
              </div>

              {/* Summary */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4">
                  CRO-analyse komplet
                </h1>
                <p className="text-neutral-300 leading-relaxed mb-6">
                  {analysis.summary}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5">
                    <span className="text-lg font-bold">{totalFindings}</span>
                    <span className="text-sm text-neutral-400">fund totalt</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10">
                    <span className="text-lg font-bold text-red-400">
                      {errorCount}
                    </span>
                    <span className="text-sm text-neutral-400">kritiske</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10">
                    <span className="text-lg font-bold text-yellow-400">
                      {warningCount}
                    </span>
                    <span className="text-sm text-neutral-400">advarsler</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10">
                    <span className="text-lg font-bold text-green-400">
                      {successCount}
                    </span>
                    <span className="text-sm text-neutral-400">bestået</span>
                  </div>
                </div>
              </div>

              {/* Screenshot */}
              {screenshot && (
                <div className="shrink-0 hidden xl:block">
                  <div className="w-64 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    <img
                      src={screenshot}
                      alt="Website screenshot"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {[
              { key: "overview" as const, icon: TrendingUp, label: "Overblik" },
              { key: "details" as const, icon: ListChecks, label: "Detaljeret analyse" },
              { key: "actions" as const, icon: Zap, label: "Quick Wins" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Category scores grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.categories.map((cat) => (
                  <div
                    key={cat.name}
                    className="glass-card rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-orange-500/20 transition-all"
                    onClick={() => setActiveTab("details")}
                  >
                    <ScoreRing
                      score={cat.score}
                      size={56}
                      strokeWidth={4}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <h3 className="font-semibold text-sm">{cat.name}</h3>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {cat.findings.length} fund
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prioritized actions */}
              <div className="glass-card rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-orange-400" />
                  Top 5 prioriterede handlinger
                </h2>
                <div className="space-y-3">
                  {analysis.prioritizedActions.map((action, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/3 hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-orange-400">
                        {i + 1}
                      </div>
                      <p className="text-sm text-neutral-200 leading-relaxed pt-1">
                        {action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshot full */}
              {screenshot && (
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-bold mb-4">
                    Screenshot (Above the Fold)
                  </h2>
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={screenshot}
                      alt="Website screenshot"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {analysis.categories.map((cat) => (
                <CategorySection key={cat.name} category={cat} />
              ))}
            </div>
          )}

          {/* Quick Wins Tab */}
          {activeTab === "actions" && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-orange-400" />
                  Quick Wins
                </h2>
                <p className="text-neutral-400 text-sm mb-6">
                  Disse ændringer kan implementeres hurtigt og har dokumenteret
                  effekt på konverteringsraten.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {analysis.quickWins.map((win, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/10"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-orange-400" />
                        <h3 className="font-semibold text-sm">{win.title}</h3>
                      </div>
                      <p className="text-sm text-neutral-300 mb-3">
                        {win.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">
                          {win.estimatedImpact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All prioritized actions */}
              <div className="glass-card rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-6">
                  Alle prioriterede handlinger
                </h2>
                <div className="space-y-3">
                  {analysis.prioritizedActions.map((action, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-orange-400">
                        {i + 1}
                      </div>
                      <p className="text-sm text-neutral-200 leading-relaxed pt-1">
                        {action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* High impact errors */}
              <div className="glass-card rounded-2xl p-8">
                <h2 className="text-xl font-bold mb-6 text-red-400">
                  Kritiske problemer at løse først
                </h2>
                <div className="space-y-3">
                  {analysis.categories
                    .flatMap((c) => c.findings)
                    .filter(
                      (f) => f.type === "error" && f.impact === "high"
                    )
                    .map((finding, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                      >
                        <h4 className="font-semibold text-sm mb-1">
                          {finding.title}
                        </h4>
                        <p className="text-sm text-neutral-400 mb-2">
                          {finding.description}
                        </p>
                        <p className="text-sm text-orange-300">
                          → {finding.recommendation}
                        </p>
                      </div>
                    ))}
                  {analysis.categories
                    .flatMap((c) => c.findings)
                    .filter(
                      (f) => f.type === "error" && f.impact === "high"
                    ).length === 0 && (
                    <p className="text-neutral-500 text-sm">
                      Ingen kritiske problemer med høj impact fundet – godt
                      klaret!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

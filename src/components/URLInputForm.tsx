"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowRight, Globe } from "lucide-react";

const AnalysisLoader = dynamic(() => import("@/components/AnalysisLoader"), {
  ssr: false,
});

export default function URLInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
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
        body: JSON.stringify({ url: url.trim(), viewport: "desktop" }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.status === 504
            ? "Analysen tog for lang tid. Prøv igen — siden kan være langsom at scrape."
            : `Serverfejl (${res.status}). Prøv igen om et øjeblik.`
        );
      }

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
    return <AnalysisLoader />;
  }

  return (
    <form onSubmit={handleAnalyze} className="w-full max-w-2xl mx-auto" role="search" aria-label="Analysér en hjemmeside">
      <div className="glass-card rounded-2xl p-2 border border-white/10 focus-within:border-orange-500/40 transition-colors">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 min-w-0">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 shrink-0" aria-hidden="true" />
            <label htmlFor="url-input" className="sr-only">
              Website URL
            </label>
            <input
              id="url-input"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Indsæt din URL her..."
              className="flex-1 min-w-0 bg-transparent border-none text-sm sm:text-base py-3 placeholder:text-neutral-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-semibold text-sm sm:text-base text-white hover:from-orange-400 hover:to-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Analysér
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
    </form>
  );
}

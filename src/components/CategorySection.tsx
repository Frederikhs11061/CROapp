"use client";

import type { Category } from "@/lib/cro-knowledge";
import FindingCard from "./FindingCard";
import ScoreRing from "./ScoreRing";

export default function CategorySection({
  category,
}: {
  category: Category;
}) {
  const successCount = category.findings.filter(
    (f) => f.type === "success"
  ).length;
  const warningCount = category.findings.filter(
    (f) => f.type === "warning"
  ).length;
  const errorCount = category.findings.filter(
    (f) => f.type === "error"
  ).length;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="text-lg font-bold">{category.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs">
              {successCount > 0 && (
                <span className="text-green-400">
                  {successCount} bestået
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-yellow-400">
                  {warningCount} advarsel{warningCount > 1 ? "er" : ""}
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-400">
                  {errorCount} kritisk{errorCount > 1 ? "e" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <ScoreRing score={category.score} size={64} strokeWidth={5} />
      </div>
      <div className="space-y-3">
        {category.findings
          .sort((a, b) => {
            const order = { error: 0, warning: 1, success: 2 };
            return order[a.type] - order[b.type];
          })
          .map((finding, i) => (
            <FindingCard key={i} finding={finding} />
          ))}
      </div>
    </div>
  );
}

"use client";

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Zap,
  Minus,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { Finding } from "@/lib/cro-knowledge";

const typeConfig = {
  success: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  error: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

const impactConfig = {
  high: { icon: Zap, label: "Høj impact", color: "text-orange-400" },
  medium: {
    icon: ArrowUpRight,
    label: "Medium impact",
    color: "text-yellow-400",
  },
  low: { icon: Minus, label: "Lav impact", color: "text-neutral-400" },
};

export default function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[finding.type];
  const impact = impactConfig[finding.impact];
  const Icon = config.icon;
  const ImpactIcon = impact.icon;

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 cursor-pointer transition-all hover:scale-[1.01]`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm">{finding.title}</h4>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`flex items-center gap-1 text-xs ${impact.color}`}
              >
                <ImpactIcon className="w-3 h-3" />
                {impact.label}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            {finding.description}
          </p>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
              {finding.recommendation && (
                <div className="flex gap-2">
                  <span className="text-xs font-medium text-orange-400 shrink-0 mt-0.5">
                    Anbefaling:
                  </span>
                  <p className="text-sm text-neutral-300">
                    {finding.recommendation}
                  </p>
                </div>
              )}
              {finding.law && (
                <p className="text-xs text-neutral-500">
                  CRO-princip: {finding.law}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

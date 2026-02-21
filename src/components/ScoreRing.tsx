"use client";

import { useEffect, useState } from "react";

type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

function getScoreColor(score: number) {
  if (score >= 80) return { stroke: "#22c55e", bg: "rgba(34,197,94,0.1)" };
  if (score >= 60) return { stroke: "#eab308", bg: "rgba(234,179,8,0.1)" };
  if (score >= 40) return { stroke: "#f97316", bg: "rgba(249,115,22,0.1)" };
  return { stroke: "#ef4444", bg: "rgba(239,68,68,0.1)" };
}

export default function ScoreRing({
  score,
  size = 160,
  strokeWidth = 10,
  label,
}: Props) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;
  const colors = getScoreColor(score);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="score-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-black tabular-nums"
            style={{ color: colors.stroke }}
          >
            {animated}
          </span>
          <span className="text-xs text-neutral-500 uppercase tracking-widest">
            / 100
          </span>
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium text-neutral-400">{label}</span>
      )}
    </div>
  );
}

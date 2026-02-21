"use client";

import { useEffect, useState } from "react";
import { Search, Globe, Brain, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Globe,
    title: "Henter hjemmesiden",
    description: "Indlæser siden og tager screenshot...",
  },
  {
    icon: Search,
    title: "Scanner struktur",
    description: "Analyserer sidestruktur, CTAs, navigation...",
  },
  {
    icon: Brain,
    title: "AI CRO-analyse",
    description: "Evaluerer mod 400+ CRO-principper...",
  },
  {
    icon: BarChart3,
    title: "Genererer rapport",
    description: "Beregner scores og prioriterer anbefalinger...",
  },
];

export default function AnalysisLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <div className="relative mb-12">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center scan-animation">
          <Search className="w-10 h-10 text-orange-400 animate-pulse" />
        </div>
        <div className="absolute -inset-4 rounded-3xl border border-orange-500/20 animate-ping opacity-20" />
      </div>

      <h2 className="text-2xl font-bold mb-2">Analyserer din hjemmeside</h2>
      <p className="text-neutral-400 mb-10">
        Dette tager typisk 30-60 sekunder
      </p>

      <div className="w-full max-w-md space-y-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;

          return (
            <div
              key={i}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                isActive
                  ? "glass-card border border-orange-500/30"
                  : isDone
                  ? "opacity-50"
                  : "opacity-20"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? "bg-orange-500/20"
                    : isDone
                    ? "bg-green-500/20"
                    : "bg-white/5"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-orange-400 animate-pulse"
                      : isDone
                      ? "text-green-400"
                      : "text-neutral-600"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`font-medium text-sm ${
                    isActive
                      ? "text-white"
                      : isDone
                      ? "text-neutral-400"
                      : "text-neutral-600"
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-xs ${
                    isActive ? "text-neutral-400" : "text-neutral-600"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ANALYSIS_CATEGORIES = [
  { key: "above-the-fold", name: "Above the Fold", icon: "👁️" },
  { key: "cta", name: "Call to Action", icon: "🎯" },
  { key: "social-proof", name: "Social Proof & Tillid", icon: "⭐" },
  { key: "content", name: "Indhold & Copywriting", icon: "✍️" },
  { key: "navigation", name: "Navigation & Struktur", icon: "🧭" },
  { key: "design", name: "Visuelt Design & UX", icon: "🎨" },
  { key: "mobile", name: "Mobil & Performance", icon: "📱" },
  { key: "conversion", name: "Konverteringselementer", icon: "💰" },
  { key: "friction", name: "Friktion & Barrierer", icon: "🚧" },
];

export type Finding = {
  type: "success" | "warning" | "error";
  title: string;
  description: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
  law: string;
};

export type Category = {
  name: string;
  score: number;
  icon: string;
  findings: Finding[];
};

export type QuickWin = {
  title: string;
  description: string;
  estimatedImpact: string;
};

export type AnalysisResult = {
  overallScore: number;
  pageType: string;
  summary: string;
  categories: Category[];
  quickWins: QuickWin[];
  prioritizedActions: string[];
};

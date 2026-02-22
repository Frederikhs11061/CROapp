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

export type ABTestIdea = {
  id: number;
  title: string;
  hypothesis: string;
  variantA: string;
  variantB: string;
  metric: string;
  expectedImpact: "high" | "medium" | "low";
  category: string;
  pageTypes: string[];
};

export type BenchmarkComparison = {
  metric: string;
  yourValue: number | string;
  industryAvg: number | string;
  topPerformers: number | string;
  status: "above" | "at" | "below";
  recommendation?: string;
};

export type BenchmarkData = {
  overallPosition: string;
  comparisons: BenchmarkComparison[];
  industryContext: string;
};

export type TechnicalHealthCheck = {
  label: string;
  status: "pass" | "fail" | "warning";
  value: string;
  detail?: string;
};

export type TechnicalHealth = {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals: {
    metric: string;
    value: string;
    rating: "good" | "needs-improvement" | "poor";
    threshold: string;
  }[];
  checks: TechnicalHealthCheck[];
  opportunities: { title: string; displayValue?: string; description: string }[];
  diagnostics: { title: string; displayValue?: string; description: string }[];
  passedCount: number;
};

export type AnalysisResult = {
  overallScore: number;
  pageType: string;
  summary: string;
  categories: Category[];
  quickWins: QuickWin[];
  prioritizedActions: string[];
  abTestIdeas: ABTestIdea[];
  benchmark: BenchmarkData;
  technicalHealth: TechnicalHealth | null;
};

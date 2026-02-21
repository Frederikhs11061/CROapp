import type { Metadata } from "next";
import ResultsClient from "./ResultsClient";

export const metadata: Metadata = {
  title: "CRO-analyserapport",
  description:
    "Din personlige CRO-rapport med scores, anbefalinger og prioriterede handlinger til at forbedre din konverteringsrate.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/results",
  },
};

export default function ResultsPage() {
  return <ResultsClient />;
}

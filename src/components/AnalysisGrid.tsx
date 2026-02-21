"use client";

import React, { useState } from "react";
import {
  Eye,
  Target,
  Shield,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

type AnalysisItem = {
  emoji?: string;
  iconKey?: string;
  label: string;
  desc: string;
  law: string;
  lawDesc: string;
  principles: string[];
  sources: { label: string; url: string }[];
};

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Eye,
  Target,
  Shield,
};

const ITEMS: AnalysisItem[] = [
  {
    iconKey: "Eye",
    label: "Above the Fold",
    desc: "Headlines, hero, første indtryk",
    law: "Loven om Første Indtryk",
    lawDesc:
      "Du har under 3 sekunder til at kommunikere din værdi. Headline, hero-billede og value proposition skal øjeblikkeligt besvare: 'Hvad er det?', 'Hvad får jeg ud af det?' og 'Hvad skal jeg gøre nu?'.",
    principles: [
      "Én klar value proposition above the fold",
      "Headline skal være benefit-orienteret, ikke feature-baseret",
      "Underoverskrift uddyber hvem det er for og hvad udbyttet er",
      "Visuelt hierarki guider øjet fra headline → subheadline → CTA",
    ],
    sources: [
      { label: "Nielsen Norman Group: How Users Read on the Web", url: "https://www.nngroup.com/articles/how-users-read-on-the-web/" },
      { label: "CXL: Above the Fold Research", url: "https://cxl.com/blog/above-the-fold/" },
    ],
  },
  {
    iconKey: "Target",
    label: "Call to Action",
    desc: "Placering, kontrast, tekst",
    law: "Loven om Klarhed",
    lawDesc:
      "En uklar CTA er en usynlig CTA. Knappen skal skille sig visuelt ud, teksten skal kommunikere værdien af at klikke, og placeringen skal matche brugerens naturlige scanmønster.",
    principles: [
      "CTA-tekst skal beskrive udbyttet, ikke handlingen ('Få gratis analyse' > 'Klik her')",
      "Kontrastfarve der skiller sig ud fra resten af siden",
      "Minimum én CTA synlig above the fold",
      "Gentag CTA 2-3 gange på længere sider (gentagelsesloven)",
    ],
    sources: [
      { label: "Unbounce: CRO Audit Guide", url: "https://unbounce.com/conversion-rate-optimization/cro-audit/" },
      { label: "HubSpot: CTA Best Practices", url: "https://blog.hubspot.com/marketing/call-to-action-examples" },
    ],
  },
  {
    iconKey: "Shield",
    label: "Social Proof & Tillid",
    desc: "Reviews, badges, garantier",
    law: "Loven om Tillid",
    lawDesc:
      "Folk køber fra dem de stoler på. Tillid opbygges via social proof (andres adfærd), autoritet (ekspert-anbefalinger), og tryghed (garantier, sikkerhedsbadges). Manglende tillid er den #1 årsag til at besøgende ikke konverterer.",
    principles: [
      "Trustpilot/anmeldelser synlige – helst above the fold",
      "Differentier: visuelle badges, tekst-signaler, social proof, autoritet",
      "Garanti-elementer tæt på CTA reducerer købs-angst",
      "Kundelogoer og 'brugt af X+' styrker flokmentalitet",
    ],
    sources: [
      { label: "Robert Cialdini: Influence (Social Proof)", url: "https://www.influenceatwork.com/7-principles-of-persuasion/" },
      { label: "Baymard Institute: Trust & Credibility", url: "https://baymard.com/blog/perceived-security-trust-seals" },
    ],
  },
  {
    emoji: "✍️",
    label: "Copywriting",
    desc: "Klarhed, benefits, USP",
    law: "Loven om Relevans",
    lawDesc:
      "Din copy skal tale til kundens behov, ikke dine features. Benefits konverterer, features informerer. Besøgende skimmer – brug bullet points, korte afsnit, og sæt det vigtigste først.",
    principles: [
      "Benefits before features – hvad får kunden ud af det?",
      "Brug kundens sprog – ikke internt fagsprog",
      "Scanbar struktur: headlines, bullets, korte afsnit",
      "USP'er synlige og differentierede fra konkurrenterne",
    ],
    sources: [
      { label: "Copyhackers: Conversion Copywriting", url: "https://copyhackers.com/conversion-copywriting/" },
      { label: "Unbounce: Landing Page Copywriting", url: "https://unbounce.com/landing-page-articles/landing-page-copywriting/" },
    ],
  },
  {
    emoji: "🧭",
    label: "Navigation",
    desc: "Struktur, hierarki, flow",
    law: "Hick's Law (Valgparalyse)",
    lawDesc:
      "Jo flere valgmuligheder, jo længere beslutningstid. Reducér navigation til 5-7 hovedpunkter. Guiding > valgfrihed. Breadcrumbs, logisk informationsarkitektur og søgefunktion hjælper brugeren finde det rigtige hurtigt.",
    principles: [
      "Max 5-7 primære menupunkter (Hick's Law)",
      "Søgefelt synligt – søgere konverterer 2-3x oftere",
      "Breadcrumbs på alle underside for kontekst og SEO",
      "Logisk hierarki: vigtigste sider mest tilgængelige",
    ],
    sources: [
      { label: "Hick's Law (Laws of UX)", url: "https://lawsofux.com/hicks-law/" },
      { label: "NN/g: Navigation Design", url: "https://www.nngroup.com/articles/navigation-ia/" },
    ],
  },
  {
    emoji: "🎨",
    label: "Design & UX",
    desc: "Layout, farver, typografi",
    law: "Loven om Visuel Hierarki",
    lawDesc:
      "Design handler ikke om at være pæn – det handler om at guide øjet. Farver, størrelse, whitespace og kontrast bestemmer hvad brugeren ser først, næst, og sidst. Godt design er usynligt; dårligt design er en barriere.",
    principles: [
      "F-mønster eller Z-mønster for visuelt flow",
      "Whitespace øger forståelse og fokus",
      "Kontrast bruges strategisk til at fremhæve CTA og vigtige elementer",
      "Konsistent design opbygger tillid (UX Honeycomb: credible, usable)",
    ],
    sources: [
      { label: "Glassbox: UX Honeycomb Framework", url: "https://www.glassbox.com/guides/cro-audit-framework/" },
      { label: "Laws of UX", url: "https://lawsofux.com/" },
    ],
  },
  {
    emoji: "📱",
    label: "Mobil & Speed",
    desc: "Responsivitet, load tid",
    law: "Loven om Hastighed",
    lawDesc:
      "Hvert sekund ekstra loadtid reducerer konverteringsraten med 7%. Mobile-first er ikke valgfrit – over 60% af trafik er mobil. Core Web Vitals (LCP, CLS, INP) er direkte Google-ranking-faktorer.",
    principles: [
      "LCP (Largest Contentful Paint) under 2.5 sekunder",
      "Tap targets min. 44x44px med tilstrækkelig afstand",
      "Lazy loading af billeder under fold",
      "Lighthouse Performance score 90+ som målsætning",
    ],
    sources: [
      { label: "Google: Core Web Vitals", url: "https://web.dev/vitals/" },
      { label: "Deloitte: Milliseconds Make Millions", url: "https://www2.deloitte.com/ie/en/pages/consulting/articles/milliseconds-make-millions.html" },
    ],
  },
  {
    emoji: "💰",
    label: "Konvertering",
    desc: "Priser, urgency, scarcity",
    law: "Loven om Motivation",
    lawDesc:
      "Konvertering kræver motivation > friktion. Urgency ('kun i dag'), scarcity ('3 tilbage'), og tydelig prisforankring ('før 599 kr – nu 399 kr') aktiverer psykologiske triggere der motiverer handling.",
    principles: [
      "Pris synlig og tydelig – ingen overraskelser i checkout",
      "Urgency-elementer (countdown, tidsbegrænsning) driver handling",
      "Scarcity (lagerstatus, begrænset udbud) aktiverer FOMO",
      "Cross-sell og upsell øger gennemsnitlig ordreværdi",
    ],
    sources: [
      { label: "Cialdini: Scarcity Principle", url: "https://www.influenceatwork.com/7-principles-of-persuasion/" },
      { label: "CXL: Urgency & Scarcity in CRO", url: "https://cxl.com/blog/urgency/" },
    ],
  },
  {
    emoji: "🚧",
    label: "Friktion",
    desc: "Barrierer, distraktioner",
    law: "Loven om Friktion",
    lawDesc:
      "Enhver unødvendig handling, distraction eller tvivl er friktion der koster konverteringer. 81% af brugere har forladt en formular pga. friktion. Fjern alt der ikke direkte bidrager til konverteringsmålet.",
    principles: [
      "Formularer max 3-4 felter for lead gen",
      "Gæste-checkout option (undgå tvunget login)",
      "Inline validering i stedet for fejl efter submit",
      "Fjern distraktioner: unødvendige links, pop-ups, sidebar",
    ],
    sources: [
      { label: "Baymard Institute: Checkout UX", url: "https://baymard.com/research/checkout-usability" },
      { label: "Glassbox: Form & Checkout Analysis", url: "https://www.glassbox.com/guides/cro-audit-framework/" },
    ],
  },
];

export default function AnalysisGrid() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" role="list">
      {ITEMS.map((item) => {
        const isOpen = expanded === item.label;
        const Icon = item.iconKey ? ICON_MAP[item.iconKey] : null;

        return (
          <React.Fragment key={item.label}>
            <button
              role="listitem"
              onClick={() => setExpanded(isOpen ? null : item.label)}
              className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl glass-card transition-all text-left w-full ${
                isOpen ? "border-orange-500/30 bg-white/[0.03]" : "hover:border-orange-500/20"
              }`}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                {item.emoji ? (
                  <span className="text-base sm:text-lg" aria-hidden="true">{item.emoji}</span>
                ) : Icon ? (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" aria-hidden="true" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm">{item.label}</p>
                <p className="text-[11px] sm:text-xs text-neutral-500">{item.desc}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="col-span-full glass-card rounded-2xl p-5 sm:p-6 border border-orange-500/10 animate-in">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Princip</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold">{item.law}</h3>
                  </div>
                  <button
                    onClick={() => setExpanded(null)}
                    className="text-xs text-neutral-500 hover:text-white transition-colors shrink-0 pt-1"
                  >
                    Luk
                  </button>
                </div>

                <p className="text-sm text-neutral-300 leading-relaxed mb-5">{item.lawDesc}</p>

                <div className="mb-5">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Hvad vi tjekker</h4>
                  <ul className="space-y-1.5">
                    {item.principles.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                        <span className="text-orange-400 mt-0.5 shrink-0">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Kilder & læs mere</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.sources.map((src) => (
                      <a
                        key={src.url}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-300 hover:text-orange-400 hover:border-orange-500/20 transition-all"
                      >
                        {src.label}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

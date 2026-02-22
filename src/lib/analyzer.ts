import { ANALYSIS_CATEGORIES } from "./cro-knowledge";
import type { AnalysisResult, Finding, Category, QuickWin, ABTestIdea, BenchmarkData, BenchmarkComparison, TechnicalHealth, SpeedData, SecurityAudit, SecurityCheck, CWVMetric } from "./cro-knowledge";
import type { ScrapedData, PageSpeedData, SecurityHeadersData } from "./scraper";

// ─── Types ──────────────────────────────────────────────────────

type PageType = "forside" | "produktside" | "kollektionsside" | "kurv" | "checkout" | "landingsside" | "andet";

type AnalysisContext = {
  data: ScrapedData;
  pageType: PageType;
  pageSpeed: PageSpeedData | null;
  pageSpeedDesktop: PageSpeedData | null;
  pageSpeedMobile: PageSpeedData | null;
};

// ─── Helpers ────────────────────────────────────────────────────

function f(
  type: Finding["type"],
  title: string,
  description: string,
  recommendation: string,
  impact: Finding["impact"],
  law: string
): Finding {
  return { type, title, description, recommendation, impact, law };
}

// ─── Page Type Detection (v2 – much smarter) ───────────────────

function detectPageType(data: ScrapedData): PageType {
  const url = data.url.toLowerCase();
  const path = new URL(data.url).pathname.toLowerCase();
  const si = data.structuralInfo;
  const ps = data.pageSignals;

  // Checkout: checkout form, payment elements, progress indicator
  if (si.hasCheckoutForm || ps.checkoutIndicators.length >= 2) {
    if (/checkout|betal|payment|kasse/i.test(url)) return "checkout";
  }

  // Cart: cart-specific page (not just a cart icon in header)
  if (/\/(cart|kurv|indkøbskurv|basket)\b/i.test(path)) return "kurv";

  // Product page: add-to-cart + product gallery/schema, NOT a collection
  if (si.hasAddToCart && (si.hasProductGallery || ps.hasProductSchema)) {
    if (ps.productCount < 4) return "produktside";
  }
  if (/\/products\/[^/]+|\/produkt\//i.test(path)) return "produktside";

  // Collection/category page: product grid with multiple products + filters
  if (ps.productCount >= 4) return "kollektionsside";
  if (si.hasFilters && ps.productCount >= 2) return "kollektionsside";
  if (/\/collections?\/?|\/kategori|\/shop\/?$/i.test(path)) return "kollektionsside";

  // Homepage: root path or very short path
  if (/^\/?$/.test(path) || path === "/index" || path === "/index.html") return "forside";
  if (path.split("/").filter(Boolean).length === 0) return "forside";

  // Landing page: has hero, CTA, not clearly another type
  if (si.hasHero && data.ctas.length > 0) return "landingsside";

  return "forside";
}

// ─── Category Analyzers (context-aware) ─────────────────────────

function analyzeAboveTheFold(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];
  const h1s = data.headings.filter((h) => h.tag === "h1");
  const aboveFoldH1 = h1s.filter((h) => h.isAboveFold);

  // H1 check (all page types)
  if (h1s.length === 0) {
    findings.push(f("error", "Manglende H1-overskrift",
      "Siden har ingen H1-overskrift. Det er kritisk for SEO og for at kommunikere sidens formål.",
      "Tilføj en klar H1 der kommunikerer det primære budskab. F.eks. for en forside: 'Danmarks bedste [produkt] – Fri fragt over 499 kr'.",
      "high", "Klarhedslov"));
  } else if (h1s.length > 1) {
    findings.push(f("warning", `${h1s.length} H1-overskrifter`,
      `Siden har ${h1s.length} H1'er. Google og besøgende forventer én klar H1 per side.`,
      `Behold kun den vigtigste H1 ("${h1s[0].text.slice(0, 50)}...") og konvertér resten til H2.`,
      "medium", "Klarhedslov"));
  }

  // Value proposition (homepage + landing page)
  if (["forside", "landingsside"].includes(pageType)) {
    const heroText = data.firstScreenContent.heroText;
    if (!heroText) {
      findings.push(f("error", "Intet værditilbud above the fold",
        "Der er ingen synlig headline above the fold. Besøgende skal forstå dit tilbud inden for 3 sekunder.",
        "Tilføj en benefit-orienteret headline øverst. F.eks.: 'Spar 30% på [produkt] – Levering på 1-2 dage'.",
        "high", "Maksimeringsloven"));
    } else {
      const benefitWords = /spar|gratis|hurtig|nem|bedste|eksklusiv|populær|save|free|fast|easy|best|exclusive|proven|boost|øg|forbedre/i;
      if (benefitWords.test(heroText)) {
        findings.push(f("success", "Benefit-orienteret headline",
          `Din H1 "${heroText.slice(0, 60)}..." kommunikerer en konkret fordel for besøgende.`, "", "high", "Maksimeringsloven"));
      } else {
        findings.push(f("warning", "Headline mangler benefit-fokus",
          `Din H1 "${heroText.slice(0, 60)}..." beskriver hvad du gør, men ikke hvad kunden får ud af det.`,
          `Omskriv til at fokusere på kundens udbytte. I stedet for "${heroText.slice(0, 40)}..." prøv f.eks.: "Opnå [benefit] med [dit produkt/service]".`,
          "high", "Maksimeringsloven"));
      }
    }

    // Hero section (only relevant for homepage/landing)
    if (data.structuralInfo.hasHero || data.firstScreenContent.hasImageAboveFold) {
      findings.push(f("success", "Hero-sektion med visuelt element",
        "Forsiden har et visuelt element above the fold der fanger opmærksomheden.", "", "medium", "Synlighedslov"));
    } else {
      findings.push(f("warning", "Svagt visuelt above the fold",
        "Ingen markant hero-sektion eller stort billede above the fold. Første indtryk er kritisk.",
        "Tilføj et hero-billede eller -video der viser dit produkt/service i brug. Vis resultatet, ikke bare produktet.",
        "medium", "Synlighedslov"));
    }

    // Subtext
    if (data.firstScreenContent.heroSubtext.length > 20) {
      findings.push(f("success", "Underoverskrift uddyber værdien",
        "Der er en underoverskrift der uddyber dit værditilbud – det hjælper besøgende med at forstå dit tilbud.", "", "medium", "Klarhedslov"));
    }
  }

  // Product page specific
  if (pageType === "produktside") {
    if (!data.structuralInfo.hasProductGallery) {
      findings.push(f("warning", "Ingen produktbillede-galleri detekteret",
        "Et stærkt produktbillede-galleri med flere vinkler er afgørende for produktsider.",
        "Tilføj min. 3-5 produktbilleder fra forskellige vinkler + evt. lifestyle-billede der viser produktet i brug.",
        "high", "Alignment-lov"));
    }
  }

  // Meta description
  const metaDesc = data.metaDescription;
  if (!metaDesc) {
    findings.push(f("error", "Manglende meta description",
      "Siden har ingen meta description. Det reducerer CTR fra Google med op til 30%.",
      `Skriv en meta description (140-155 tegn) der inkluderer dit kernebudskab + CTA. F.eks.: "Opdag ${data.title?.split(/[-|–]/)[0]?.trim() || 'vores udvalg'}. Fri fragt | Hurtig levering | 30 dages returret."`,
      "high", "Synlighedslov"));
  } else if (metaDesc.length < 100 || metaDesc.length > 160) {
    findings.push(f("warning", `Meta description er ${metaDesc.length} tegn`,
      `Ideel længde er 140-155 tegn. Din er ${metaDesc.length} tegn${metaDesc.length < 100 ? " – for kort til at udnytte pladsen i Google" : " – vil blive afkortet"}.`,
      `Tilpas til 140-155 tegn. Nuværende: "${metaDesc.slice(0, 80)}..."`,
      "medium", "Synlighedslov"));
  } else {
    findings.push(f("success", "God meta description",
      `Meta description er ${metaDesc.length} tegn – ideel længde for søgeresultater.`, "", "low", "Synlighedslov"));
  }

  return { name: "Above the Fold", score: calcScore(findings), icon: "👁️", findings };
}

function analyzeCTA(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];
  const ctas = data.ctas;
  const primaryCTAs = ctas.filter((c) => c.isPrimary);
  const aboveFoldCTAs = ctas.filter((c) => c.isAboveFold);

  // CTA presence
  if (ctas.length === 0) {
    findings.push(f("error", "Ingen CTA-knapper fundet",
      "Uden call-to-action ved besøgende ikke hvad de skal gøre. Det er det vigtigste element for konvertering.",
      pageType === "produktside"
        ? "Tilføj en tydelig 'Læg i kurv' / 'Køb nu' knap med høj kontrast (f.eks. fuld baggrund, stor font)."
        : "Tilføj en primær CTA above the fold. Brug action-ord: 'Se vores udvalg', 'Kom i gang', 'Få tilbud'.",
      "high", "Synlighedslov"));
  } else {
    // Above fold CTA
    if (aboveFoldCTAs.length === 0) {
      findings.push(f("error", "Ingen CTA synlig above the fold",
        "Der er CTAs på siden, men ingen er synlige uden at scrolle. De fleste besøgende ser kun above the fold.",
        "Flyt den vigtigste CTA op above the fold, tæt på din headline/værditilbud.",
        "high", "Synlighedslov"));
    } else {
      findings.push(f("success", `CTA synlig above the fold`,
        `${aboveFoldCTAs.length} CTA-knap(per) er synlig(e) med det samme – godt for konvertering.`, "", "high", "Synlighedslov"));
    }

    // Primary CTA prominence
    if (primaryCTAs.length === 0 && ctas.length > 0) {
      findings.push(f("warning", "Ingen fremtrædende primær CTA",
        "Alle CTA-knapper er små eller har lille font. Den vigtigste handling bør visuelt skille sig ud.",
        "Gør din primære CTA større (min. 44px høj, 16px+ font), med solid baggrundfarve der skiller sig ud fra resten af designet.",
        "high", "Synlighedslov"));
    } else if (primaryCTAs.length >= 1) {
      findings.push(f("success", "Fremtrædende primær CTA",
        `Der er ${primaryCTAs.length} tydelig(e) primær CTA-knap(per) med god størrelse og synlighed.`, "", "high", "Synlighedslov"));
    }

    // CTA text quality
    const actionPattern = /køb|bestil|tilføj|start|prøv|hent|få|book|download|tilmeld|opret|se |shop|buy|add|get|try|order|subscribe/i;
    const vaguePattern = /^(læs mere|klik her|mere|submit|send|click here|read more|more|learn more|link|undefined)$/i;
    const ctaWithAction = ctas.filter((c) => actionPattern.test(c.text));
    const vagueCtas = ctas.filter((c) => vaguePattern.test(c.text.trim()));

    if (ctaWithAction.length > 0) {
      findings.push(f("success", "Handlingsorienterede CTA-tekster",
        `CTAs bruger gode action-ord: "${ctaWithAction.slice(0, 2).map((c) => c.text).join('", "')}"`, "", "medium", "Maksimeringsloven"));
    } else {
      const suggestion = pageType === "produktside"
        ? "'Læg i kurv', 'Køb nu – Fri fragt'"
        : "'Se vores udvalg', 'Få gratis tilbud', 'Start i dag'";
      findings.push(f("warning", "CTA-tekster mangler handling",
        "Ingen CTA-knapper bruger stærke handlingsord. Vage tekster konverterer markant dårligere.",
        `Omskriv til specifikke handlinger: ${suggestion}. Tilføj gerne benefit i knapteksten.`,
        "high", "Maksimeringsloven"));
    }

    if (vagueCtas.length > 0) {
      findings.push(f("warning", `${vagueCtas.length} vag(e) CTA-tekst(er)`,
        `"${vagueCtas[0].text}" siger ikke hvad besøgende får. Det reducerer klikrate markant.`,
        `Erstat "${vagueCtas[0].text}" med specifik handling + benefit: "Se produkter – Fri fragt over 499 kr" i stedet for "Læs mere".`,
        "medium", "Klarhedslov"));
    }
  }

  // Repetition (not just count, but distribution)
  if (ctas.length >= 2 && ctas.length <= 8) {
    const aboveCount = aboveFoldCTAs.length;
    const belowCount = ctas.length - aboveCount;
    if (aboveCount > 0 && belowCount > 0) {
      findings.push(f("success", "CTA gentaget på siden",
        `CTA er placeret both above (${aboveCount}) og below fold (${belowCount}) – god brug af gentagelsesloven.`, "", "medium", "Gentagelseslov"));
    }
  }

  return { name: "Call to Action", score: calcScore(findings), icon: "🎯", findings };
}

function analyzeTrust(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];
  const ts = data.trustSignals;

  const badges = ts.filter((t) => t.type === "badge");
  const textSignals = ts.filter((t) => t.type === "text");
  const socialProof = ts.filter((t) => t.type === "social_proof");
  const authority = ts.filter((t) => t.type === "authority");

  // Social proof
  if (socialProof.length > 0) {
    findings.push(f("success", "Social proof til stede",
      `Fandt ${socialProof.length} social proof-signal(er): ${socialProof.map((s) => s.description).join(", ")}.`, "", "high", "Tillidslov"));
  } else {
    findings.push(f("error", "Mangler social proof",
      "Ingen anmeldelser, ratings eller kundeudtalelser fundet. 93% af forbrugere læser reviews før køb.",
      "Tilføj Trustpilot-widget, Google Reviews, eller kundecitater med navn og evt. billede. Placér tæt på CTA.",
      "high", "Tillidslov"));
  }

  // Trust badges (visual)
  if (badges.length > 0) {
    findings.push(f("success", "Visuelle trust badges",
      `${badges.length} trust badge(s) fundet – visuelle symboler opbygger tillid hurtigt.`, "", "medium", "Tillidslov"));
  } else {
    const where = pageType === "produktside" ? "tæt på 'Læg i kurv'-knappen" : "i header/footer og nær CTAs";
    findings.push(f("warning", "Ingen visuelle trust badges",
      "Ingen visuelt synlige trust badges som e-mærket, sikker betaling-ikon, eller Trustpilot-badge.",
      `Tilføj trust badges ${where}. Eksempler: 'Sikker betaling', 'e-mærket', Trustpilot-score, 'Trusted shop'.`,
      "medium", "Tillidslov"));
  }

  // Text-based trust signals
  if (textSignals.length > 0) {
    findings.push(f("success", "Tillids-signaler i tekst",
      `Fandt: ${textSignals.map((s) => s.description).join(", ")}. Det reducerer oplevelsen af risiko.`, "", "medium", "Tab-lov"));
  } else {
    findings.push(f("warning", "Mangler tillids-tekst",
      "Ingen garanti, returret, fri fragt eller sikker betaling nævnt i teksten.",
      "Tilføj synlige tillids-elementer: '30 dages returret', 'Gratis fragt over 499 kr', 'Sikker betaling med kort & MobilePay'.",
      "high", "Tab-lov"));
  }

  // Authority
  if (authority.length > 0) {
    findings.push(f("success", "Autoritets-signaler",
      `${authority.map((a) => a.description).join(", ")}. Det opbygger troværdighed.`, "", "medium", "Tillidslov"));
  }

  // Testimonials section
  if (data.structuralInfo.hasTestimonials) {
    findings.push(f("success", "Testimonials-sektion",
      "Dedikeret testimonials/anmeldelsessektion fundet – et af de stærkeste konverteringsmidler.", "", "high", "Tillidslov"));
  } else if (["forside", "landingsside", "produktside"].includes(pageType)) {
    findings.push(f("warning", "Mangler testimonials-sektion",
      "Ingen dedikeret sektion med kundecitater. Personlige udtalelser konverterer bedre end anonyme ratings.",
      "Tilføj 2-4 kundecitater med: fuldt navn, evt. billede, specifik result ('Vi øgede vores salg med 34%').",
      "medium", "Tillidslov"));
  }

  return { name: "Social Proof & Tillid", score: calcScore(findings), icon: "⭐", findings };
}

function analyzeContent(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];
  const copy = data.copyAnalysis;

  // Heading structure
  const h1c = data.headings.filter((h) => h.tag === "h1").length;
  const h2c = data.headings.filter((h) => h.tag === "h2").length;

  if (h2c >= 2) {
    findings.push(f("success", "God overskriftsstruktur",
      `${h1c} H1 og ${h2c} H2-overskrifter – giver godt hierarki og gør indholdet scanbart.`, "", "medium", "Klarhedslov"));
  } else if (data.headings.length > 0) {
    findings.push(f("warning", "Svag overskriftsstruktur",
      `Kun ${h2c} H2-overskrift(er). Besøgende scanner overskrifter – brug dem til at fortælle din historie.`,
      "Opdel indholdet med H2-overskrifter for hvert kernebudskab. F.eks.: 'Hvorfor vælge os', 'Sådan virker det', 'Det siger kunderne'.",
      "medium", "Klarhedslov"));
  }

  // Title tag
  if (!data.title) {
    findings.push(f("error", "Manglende title tag", "Ingen title tag – kritisk for SEO.",
      "Tilføj en title tag (55-60 tegn) med primært keyword + benefit. F.eks.: '[Brand] – [Hvad du tilbyder] | [Benefit]'.",
      "high", "Synlighedslov"));
  } else if (data.title.length >= 40 && data.title.length <= 65) {
    findings.push(f("success", "God title tag",
      `"${data.title}" (${data.title.length} tegn) – god længde for søgeresultater.`, "", "medium", "Synlighedslov"));
  } else {
    findings.push(f("warning", `Title tag er ${data.title.length} tegn`,
      `"${data.title}" – ${data.title.length < 40 ? "for kort, du udnytter ikke pladsen i Google" : "for lang, vil blive afkortet"}.`,
      `Tilpas til 55-60 tegn. Forslag: "${data.title.slice(0, 45)}... | [Benefit]"`,
      "medium", "Synlighedslov"));
  }

  // Alt text
  const noAlt = data.images.filter((i) => !i.hasAlt);
  if (noAlt.length > 0) {
    findings.push(f("warning", `${noAlt.length} billede(r) mangler alt-tekst`,
      `${noAlt.length} af ${data.images.length} billeder har ingen alt-tekst. Dårligt for SEO og tilgængelighed.`,
      "Tilføj beskrivende alt-tekst der forklarer billedets indhold. F.eks.: 'Sort læderjakke model set forfra' i stedet for 'IMG_001'.",
      "medium", "Synlighedslov"));
  } else if (data.images.length > 0) {
    findings.push(f("success", "Alle billeder har alt-tekst",
      `${data.images.length} billeder med alt-tekst – godt for SEO og tilgængelighed.`, "", "low", "Synlighedslov"));
  }

  // Copy quality: Benefits vs Features
  if (copy.benefitStatements.length >= 2) {
    findings.push(f("success", "Benefit-orienteret copy",
      `Fandt ${copy.benefitStatements.length} benefit-udsagn i teksten. Det appellerer til kundens motivation.`, "", "medium", "Maksimeringsloven"));
  } else {
    findings.push(f("warning", "Copy er for feature-fokuseret",
      copy.featureStatements.length > 0
        ? `Fandt ${copy.featureStatements.length} feature-beskrivelser men kun ${copy.benefitStatements.length} benefits. Kunder køber benefits, ikke features.`
        : "Teksten mangler tydelige benefit-udsagn der fortæller kunden hvad de opnår.",
      "Omskriv features til benefits. I stedet for 'Lavet af 100% bomuld' → 'Blød som silke – hele dagen lang'. Fokus: hvad kunden MÆRKER, ikke hvad produktet ER.",
      "medium", "Maksimeringsloven"));
  }

  // USP visibility
  if (copy.usps.length >= 2) {
    findings.push(f("success", "USP'er synlige",
      `${copy.usps.length} USP-elementer fundet: "${copy.usps.slice(0, 2).join('", "')}"`, "", "medium", "Maksimeringsloven"));
  } else if (["forside", "produktside", "landingsside"].includes(pageType)) {
    findings.push(f("warning", "USP'er ikke tydeligt fremhævet",
      "Ingen tydelig USP-sektion fundet (unique selling propositions). Besøgende skal hurtigt forstå hvorfor vælge dig.",
      "Tilføj 3-5 USP'er synligt under headline. F.eks.: '✓ Fri fragt over 499 kr  ✓ 30 dages returret  ✓ Dansk kundeservice  ✓ Levering på 1-2 dage'.",
      "high", "Maksimeringsloven"));
  }

  return { name: "Indhold & Copywriting", score: calcScore(findings), icon: "✍️", findings };
}

function analyzeNavigation(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];
  const si = data.structuralInfo;

  if (si.hasNav) {
    if (si.navItemCount > 0 && si.navItemCount <= 7) {
      findings.push(f("success", "Klar navigation",
        `Navigation med ${si.navItemCount} links – overskueligt og inden for det anbefalede max 7.`, "", "medium", "Klarhedslov"));
    } else if (si.navItemCount > 7) {
      findings.push(f("warning", `${si.navItemCount} menupunkter i navigation`,
        `Det er over de anbefalede max 7. For mange valgmuligheder skaber beslutningsparalyse.`,
        "Reducer til max 5-7 primære menupunkter. Flyt resten til dropdown-undermenuer eller footer.",
        "medium", "Friktionslov"));
    } else {
      findings.push(f("success", "Navigation fundet", "Siden har en navigationsstruktur.", "", "low", "Klarhedslov"));
    }
  } else {
    if (pageType !== "checkout") {
      findings.push(f("error", "Ingen navigation fundet",
        "Besøgende kan ikke navigere til andre sider.",
        "Tilføj en klar top-navigation med de vigtigste sider.", "high", "Klarhedslov"));
    } else {
      findings.push(f("success", "Minimal navigation i checkout",
        "Checkout-sider bør have minimal navigation for at reducere distraktioner.", "", "medium", "Friktionslov"));
    }
  }

  if (si.hasFooter) {
    findings.push(f("success", "Footer med info", "Footer giver ekstra navigation og tillid.", "", "low", "Tillidslov"));
  }

  if (si.hasBreadcrumbs) {
    findings.push(f("success", "Breadcrumbs implementeret",
      "Breadcrumbs giver brugere kontekst og forbedrer SEO med intern linking.", "", "medium", "Klarhedslov"));
  } else if (["produktside", "kollektionsside"].includes(pageType)) {
    findings.push(f("warning", "Mangler breadcrumbs",
      "Ingen breadcrumbs fundet. På produkt- og kategorisider hjælper breadcrumbs navigation og SEO.",
      "Tilføj breadcrumbs: 'Forside > Kategori > Produkt'. Implementér med schema.org BreadcrumbList markup.",
      "medium", "Klarhedslov"));
  }

  if (si.hasFAQ) {
    findings.push(f("success", "FAQ-sektion fundet",
      "FAQ adresserer tvivl, reducerer supportbelastning og kan ranke som featured snippet i Google.", "", "medium", "Tab-lov"));
  } else if (["forside", "produktside", "landingsside"].includes(pageType)) {
    findings.push(f("warning", "Mangler FAQ",
      "Ingen FAQ fundet. En FAQ adresserer de top-indvendinger der forhindrer køb.",
      "Tilføj FAQ med de 4-6 mest stillede spørgsmål. F.eks.: 'Hvor lang er leveringstiden?', 'Kan jeg returnere?', 'Hvilke betalingsmetoder?'. Tilføj FAQPage schema markup.",
      "medium", "Tab-lov"));
  }

  return { name: "Navigation & Struktur", score: calcScore(findings), icon: "🧭", findings };
}

function analyzeDesignUX(ctx: AnalysisContext): Category {
  const { data } = ctx;
  const findings: Finding[] = [];

  const imgCount = data.images.length;
  if (imgCount >= 3) {
    findings.push(f("success", "Godt visuelt indhold", `${imgCount} billeder beriger det visuelle udtryk.`, "", "medium", "Alignment-lov"));
  } else if (imgCount === 0) {
    findings.push(f("error", "Ingen billeder",
      "Helt uden billeder. Visuelt indhold er afgørende for engagement.",
      "Tilføj relevante billeder: produktfotos, hero-billeder, eller illustrationer der forklarer dit tilbud.", "high", "Alignment-lov"));
  } else {
    findings.push(f("warning", "Få billeder",
      `Kun ${imgCount} billede(r). Mere visuelt indhold øger engagement og tid på siden.`,
      "Tilføj produktbilleder, lifestyle-fotos, ikoner eller illustrationer til hvert indholdsafsnit.", "medium", "Alignment-lov"));
  }

  if (data.structuralInfo.hasVideo) {
    findings.push(f("success", "Video-indhold", "Video øger engagement med op til 80% og tid på siden markant.", "", "medium", "Alignment-lov"));
  }

  if (data.structuralInfo.sectionCount >= 3) {
    findings.push(f("success", "Visuelt opdelt layout",
      `${data.structuralInfo.sectionCount} sektioner giver god visuel adskillelse og overskuelighed.`, "", "medium", "Klarhedslov"));
  }

  if (data.metaTags["og:image"]) {
    findings.push(f("success", "Open Graph-billede", "OG-billede sat – vigtigt for previews på sociale medier.", "", "low", "Synlighedslov"));
  } else {
    findings.push(f("warning", "Mangler Open Graph-billede",
      "Ingen og:image. Deling på Facebook/LinkedIn viser intet preview.",
      "Tilføj et attraktivt og:image (1200x630px) med dit logo/produkt og en kort tekst.", "medium", "Synlighedslov"));
  }

  return { name: "Visuelt Design & UX", score: calcScore(findings), icon: "🎨", findings };
}

function analyzePerformance(ctx: AnalysisContext): Category {
  const { data, pageSpeedDesktop: psD, pageSpeedMobile: psM } = ctx;
  const findings: Finding[] = [];

  const hasAnyPageSpeed = psD || psM;

  if (hasAnyPageSpeed) {
    // Desktop Lighthouse
    if (psD) {
      const s = psD.performanceScore;
      if (s >= 90) {
        findings.push(f("success", `Desktop Lighthouse: ${s}/100`,
          `Fremragende desktop performance-score fra Google PageSpeed Insights.`, "", "high", "Friktionslov"));
      } else if (s >= 50) {
        findings.push(f("warning", `Desktop Lighthouse: ${s}/100`,
          `Desktop performance-score er ${s}/100. Under 90 er suboptimalt.`,
          "Fokusér på at reducere LCP, minimér JavaScript-bundler og optimer billeder til WebP/AVIF.",
          "high", "Friktionslov"));
      } else {
        findings.push(f("error", `Desktop Lighthouse: ${s}/100`,
          `Kritisk lav desktop performance-score (${s}/100). Det påvirker både SEO-ranking og konverteringsrate.`,
          "Prioritér: 1) Optimer billeder (WebP, lazy-load) 2) Reducer render-blocking JS/CSS 3) Aktivér server-caching/CDN.",
          "high", "Friktionslov"));
      }
    }

    // Mobile Lighthouse
    if (psM) {
      const s = psM.performanceScore;
      if (s >= 90) {
        findings.push(f("success", `Mobil Lighthouse: ${s}/100`,
          `Fremragende mobil performance-score fra Google PageSpeed Insights.`, "", "high", "Friktionslov"));
      } else if (s >= 50) {
        findings.push(f("warning", `Mobil Lighthouse: ${s}/100`,
          `Mobil performance-score er ${s}/100. Over 60% af trafik er mobil – under 90 koster konverteringer.`,
          "Mobil kræver ekstra optimering: reducer JavaScript, brug responsive billeder og lazy-load aggressivt.",
          "high", "Friktionslov"));
      } else {
        findings.push(f("error", `Mobil Lighthouse: ${s}/100`,
          `Kritisk lav mobil performance-score (${s}/100). Google bruger mobil-score til ranking (Mobile-First Indexing).`,
          "Akut: 1) Reducer Total Blocking Time med code-splitting 2) Optimer billeder 3) Fjern unødvendige tredjepartsscripts 4) Overvej CDN.",
          "high", "Friktionslov"));
      }
    }

    // LCP from best available source (prefer desktop, show both if available)
    const psMain = psD || psM;
    if (psMain && psMain.lcp > 0) {
      const lcpSec = (psMain.lcp / 1000).toFixed(1);
      const device = psMain === psD ? "desktop" : "mobil";
      if (psMain.lcp <= 2500) {
        findings.push(f("success", `LCP: ${lcpSec}s (${device})`,
          `Largest Contentful Paint er ${lcpSec}s – under Googles anbefaling på 2.5s.`, "", "high", "Friktionslov"));
      } else if (psMain.lcp <= 4000) {
        findings.push(f("warning", `LCP: ${lcpSec}s (${device})`,
          `Largest Contentful Paint er ${lcpSec}s. Google anbefaler under 2.5s.`,
          "Optimer det største synlige element (typisk hero-billede): brug WebP/AVIF, preload det, og reducer dets filstørrelse.",
          "high", "Friktionslov"));
      } else {
        findings.push(f("error", `LCP: ${lcpSec}s (${device})`,
          `Largest Contentful Paint er ${lcpSec}s – langt over Googles 2.5s anbefaling. Hvert sekund over 3s mister du ~7% konverteringer.`,
          "Akut: preload hero-billede, konverter til WebP, reducer JavaScript, overvej CDN.",
          "high", "Friktionslov"));
      }
    }

    // CLS
    if (psMain && psMain.cls > 0.25) {
      findings.push(f("warning", `CLS: ${psMain.cls.toFixed(3)} (layout-ustabilitet)`,
        "Elementer flytter sig mens siden loader. Det skaber dårlig brugeroplevelse og lavere SEO-score.",
        "Sæt faste width/height på billeder og embeds. Undgå at indsætte indhold dynamisk over eksisterende content.",
        "medium", "Friktionslov"));
    } else if (psMain && psMain.cls >= 0) {
      findings.push(f("success", `CLS: ${psMain.cls.toFixed(3)} (stabilt)`,
        "Layout er stabilt mens siden loader – god brugeroplevelse.", "", "medium", "Friktionslov"));
    }
  } else {
    const lt = data.performance.loadTime;
    if (lt < 2000) {
      findings.push(f("success", `Loadtid: ${(lt / 1000).toFixed(1)}s`,
        "Under 2 sekunder – hurtig nok til de fleste brugere.", "", "high", "Friktionslov"));
    } else if (lt < 4000) {
      findings.push(f("warning", `Loadtid: ${(lt / 1000).toFixed(1)}s`,
        `Loadtiden er ${(lt / 1000).toFixed(1)}s. Under 2 sekunder er ideelt.`,
        "Optimer billeder (WebP/AVIF), aktivér caching, reducer JavaScript.",
        "high", "Friktionslov"));
    } else {
      findings.push(f("error", `Loadtid: ${(lt / 1000).toFixed(1)}s`,
        `${(lt / 1000).toFixed(1)}s er for langsomt. 53% forlader en side efter 3 sekunder.`,
        "Prioritér: komprimer billeder, lazy-load under fold, fjern unødvendige scripts, brug CDN.",
        "high", "Friktionslov"));
    }
  }

  // Viewport meta
  if (data.metaTags["viewport"]) {
    findings.push(f("success", "Viewport meta tag", "Mobiloptimering aktiveret med viewport meta tag.", "", "high", "Friktionslov"));
  } else {
    findings.push(f("error", "Mangler viewport meta tag",
      "Siden er sandsynligvis ikke mobiloptimeret. Over 60% af trafik er mobil.",
      "Tilføj: <meta name='viewport' content='width=device-width, initial-scale=1'>", "high", "Friktionslov"));
  }

  return { name: "Mobil & Performance", score: calcScore(findings), icon: "📱", findings };
}

function analyzeConversion(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];
  const copy = data.copyAnalysis;

  // Price visibility (context-aware!)
  if (["produktside", "kollektionsside", "kurv", "checkout"].includes(pageType)) {
    if (data.pageSignals.priceVisible || data.structuralInfo.hasPricing) {
      findings.push(f("success", "Priser synlige",
        "Priser er tydeligt vist – transparens er afgørende for konvertering i e-commerce.", "", "high", "Klarhedslov"));
    } else {
      findings.push(f("error", "Priser ikke synlige",
        "Ingen priser fundet på en side der bør vise dem. Mangel på pristransparens er en topgrund til at besøgende forlader.",
        "Vis priser tydeligt. Brug prisforankring (førpris/nu-pris) for at fremhæve besparelser: '<s>599 kr</s> 399 kr – Spar 33%'.",
        "high", "Klarhedslov"));
    }
  }

  // Urgency
  if (copy.urgencyElements.length > 0) {
    findings.push(f("success", "Urgency-elementer",
      `Bruger urgency: "${copy.urgencyElements[0].slice(0, 60)}..." – motiverer hurtig handling.`, "", "medium", "Tab-lov"));
  } else if (["produktside", "landingsside"].includes(pageType)) {
    findings.push(f("warning", "Mangler urgency",
      "Ingen urgency-elementer fundet. Uden tidspress udskyder besøgende købet og vender ofte aldrig tilbage.",
      "Tilføj ærlige urgency-elementer: 'Kun 3 tilbage på lager', 'Tilbud gælder kun denne uge', eller 'Bestil inden kl. 14 – levering i morgen'.",
      "medium", "Tab-lov"));
  }

  // Newsletter
  if (data.structuralInfo.hasNewsletter) {
    findings.push(f("success", "Email-signup",
      "Nyhedsbrev-signup opfanger besøgende der ikke konverterer med det samme – vigtig retargeting-kanal.", "", "medium", "Gentagelseslov"));
  } else if (["forside", "landingsside"].includes(pageType)) {
    findings.push(f("warning", "Mangler email-signup",
      "Ingen nyhedsbrev-tilmelding fundet. Du mister muligheden for at følge op på 95%+ af besøgende der ikke køber første gang.",
      "Tilføj email-signup med incitament: 'Få 10% rabat på din første ordre' eller 'Tilmeld dig og få gratis [ressource]'.",
      "medium", "Gentagelseslov"));
  }

  // Guarantee
  if (copy.guaranteeStatements.length > 0) {
    findings.push(f("success", "Garanti synlig",
      `Garanti/returret nævnt: "${copy.guaranteeStatements[0].slice(0, 60)}..." – reducerer oplevelsen af risiko markant.`, "", "high", "Tab-lov"));
  } else {
    findings.push(f("warning", "Ingen garanti synlig",
      "Ingen garanti, returret eller money-back er synlig. Det øger den oplevede risiko.",
      "Tilføj en synlig garanti tæt på CTA. F.eks.: '✓ 30 dages fuld returret  ✓ Pengene tilbage-garanti  ✓ Gratis ombytning'.",
      "high", "Tab-lov"));
  }

  // Add to cart (product pages)
  if (pageType === "produktside") {
    if (data.structuralInfo.hasAddToCart) {
      findings.push(f("success", "'Læg i kurv' synlig", "Add-to-cart funktionalitet er implementeret.", "", "high", "Synlighedslov"));
    } else {
      findings.push(f("error", "Mangler 'Læg i kurv'",
        "Ingen add-to-cart knap detekteret på produktsiden.",
        "Tilføj en tydelig, sticky 'Læg i kurv'-knap med høj kontrast. Brug evt. sticky CTA på mobil.",
        "high", "Synlighedslov"));
    }
  }

  // Checkout specific
  if (pageType === "checkout") {
    if (data.structuralInfo.hasProgressIndicator) {
      findings.push(f("success", "Progress-indikator i checkout",
        "Besøgende kan se hvor de er i checkout-processen – reducerer opgivelse.", "", "medium", "Klarhedslov"));
    } else {
      findings.push(f("warning", "Mangler progress-indikator",
        "Ingen progress-indikator i checkout. Besøgende ved ikke hvor langt de er.",
        "Tilføj en progress bar: 'Trin 1: Info → Trin 2: Levering → Trin 3: Betaling'.",
        "medium", "Klarhedslov"));
    }
  }

  return { name: "Konverteringselementer", score: calcScore(findings), icon: "💰", findings };
}

function analyzeFriction(ctx: AnalysisContext): Category {
  const { data, pageType } = ctx;
  const findings: Finding[] = [];

  // Form friction
  const bigForms = data.forms.filter((fo) => fo.fields > 5);
  if (bigForms.length > 0) {
    findings.push(f("error", `Formular med ${bigForms[0].fields} felter`,
      `Hvert ekstra felt reducerer konverteringsraten med ca. 11%. ${bigForms[0].fields} felter er for mange.`,
      "Reducer til max 3-4 felter for lead gen. For checkout: brug progressiv afsløring (vis felter i trin). Overvej autofill.",
      "high", "Friktionslov"));
  } else if (data.forms.length > 0 && data.forms.every((fo) => fo.fields <= 5)) {
    findings.push(f("success", "Korte formularer",
      "Formularerne har et lavt antal felter – det reducerer friktion.", "", "medium", "Friktionslov"));
  }

  // Privacy
  const text = data.textContent.toLowerCase();
  if (/privatliv|privacy|gdpr|cookie|persondataforordning/i.test(text)) {
    findings.push(f("success", "Privatlivspolitik synlig", "GDPR/privatliv er refereret – lovpligtigt og tillidsopbyggende.", "", "medium", "Tab-lov"));
  } else {
    findings.push(f("warning", "Privatlivspolitik ikke synlig",
      "Ingen synlig reference til privatlivspolitik. Det er lovpligtigt i EU.",
      "Sørg for at linke til privatlivspolitik fra footer og nær alle formularer.", "medium", "Tab-lov"));
  }

  // Contact info
  if (/kontakt|contact|telefon|phone|@.*\.|e-?mail|tlf|ring til/i.test(text)) {
    findings.push(f("success", "Kontaktinfo tilgængelig",
      "Besøgende kan finde kontaktinformation, hvilket øger tillid.", "", "medium", "Tillidslov"));
  } else {
    findings.push(f("warning", "Kontaktinfo ikke umiddelbart synlig",
      "Ingen telefonnummer, email eller kontaktformular synlig. Det kan virke utroværdigt.",
      "Tilføj kontaktinfo i header/footer. Telefonnummer i headeren øger tillid med op til 20%.",
      "medium", "Tillidslov"));
  }

  // Enhanced form friction (Glassbox: form & checkout analysis)
  if (data.forms.length > 0) {
    const formWithoutLabels = data.forms.find((fo) => !fo.hasLabels && fo.fields > 0);
    if (formWithoutLabels) {
      findings.push(f("warning", "Formular mangler labels",
        "Formularer uden synlige labels er sværere at udfylde, især for tilgængelighed.",
        "Tilføj synlige labels over hvert felt. Brug ikke kun placeholders – de forsvinder når brugeren begynder at skrive.",
        "medium", "Friktionslov"));
    }
    const formWithoutValidation = data.forms.find((fo) => !fo.hasValidation && fo.fields >= 3);
    if (formWithoutValidation) {
      findings.push(f("warning", "Ingen inline-validering på formular",
        "Formularer uden realtids-validering fører til frustrerende 'submit-and-see-errors' oplevelser.",
        "Implementer inline-validering der viser grøn checkmark ved korrekte felter og rød fejlbesked med det samme.",
        "medium", "Friktionslov"));
    }
  }

  // External link overload (context-aware)
  const extLinks = data.links.filter((l) => l.isExternal).length;
  if (pageType === "checkout" && extLinks > 3) {
    findings.push(f("warning", `${extLinks} eksterne links i checkout`,
      "I checkout bør distraktioner minimeres. Eksterne links leder potentielle kunder væk.",
      "Fjern alle unødvendige eksterne links fra checkout. Kun nødvendige (vilkår, privatlivspolitik) bør blive.",
      "medium", "Friktionslov"));
  }

  // UX Honeycomb: Accessibility (Glassbox + Unbounce)
  if (data.uxSignals) {
    if (!data.uxSignals.hasSearchField && (pageType === "forside" || pageType === "kollektionsside")) {
      findings.push(f("warning", "Ingen synlig søgefunktion",
        "Site search er en af de mest værdifulde CRO-elementer. Besøgende der søger konverterer 2-3x oftere.",
        "Tilføj et synligt søgefelt i header med placeholder-tekst (fx 'Søg efter produkter...'). Overvej autocomplete.",
        "high", "Findability"));
    }
    if (!data.uxSignals.hasAltOnAllImages) {
      findings.push(f("warning", "Billeder mangler alt-tekst",
        "Billeder uden alt-tekst skader både tilgængelighed og SEO.",
        "Tilføj beskrivende alt-tekst til alle billeder. For produkter: inkluder produktnavn og primær feature.",
        "medium", "Tilgængelighed"));
    }
    if (!data.uxSignals.hasCookieConsent) {
      findings.push(f("warning", "Ingen cookie-samtykke synlig",
        "EU-lovgivning kræver cookie-samtykke. Manglende samtykke kan resultere i bøder og signalerer manglende professionalisme.",
        "Implementer en cookie-consent banner der er GDPR-kompatibel.",
        "medium", "Tillidslov"));
    }
  }

  // Chat widget (conversion recovery)
  if (data.uxSignals && !data.uxSignals.hasChatWidget && (pageType === "produktside" || pageType === "checkout")) {
    findings.push(f("warning", "Ingen live chat / support widget",
      "Live chat på produkt- og checkout-sider kan reducere abandoned carts med 20-30% ved at besvare spørgsmål i realtid.",
      "Overvej en chat-widget (Zendesk, Intercom, Tidio) med proaktive triggers på checkout-sider.",
      "medium", "Friktionslov"));
  }

  return { name: "Friktion & Barrierer", score: calcScore(findings), icon: "🚧", findings };
}

// ─── Scoring ────────────────────────────────────────────────────

function calcScore(findings: Finding[]): number {
  if (findings.length === 0) return 50;
  const weights = { high: 3, medium: 2, low: 1 };
  let total = 0, earned = 0;
  for (const fi of findings) {
    const w = weights[fi.impact];
    total += w;
    if (fi.type === "success") earned += w;
    else if (fi.type === "warning") earned += w * 0.35;
  }
  return Math.round((earned / total) * 100);
}

// ─── Quick wins & actions ───────────────────────────────────────

function generateQuickWins(categories: Category[]): QuickWin[] {
  return categories
    .flatMap((c) => c.findings)
    .filter((fi) => fi.type !== "success" && fi.impact === "high" && fi.recommendation)
    .slice(0, 5)
    .map((fi) => ({
      title: fi.title,
      description: fi.recommendation,
      estimatedImpact: fi.type === "error" ? "Høj – løs dette først" : "Medium-høj – kan implementeres hurtigt",
    }));
}

function generatePrioritizedActions(categories: Category[]): string[] {
  return categories
    .flatMap((c) => c.findings)
    .filter((fi) => fi.type !== "success" && fi.recommendation)
    .sort((a, b) => {
      const imp = { high: 0, medium: 1, low: 2 };
      const typ = { error: 0, warning: 1, success: 2 };
      return imp[a.impact] - imp[b.impact] || typ[a.type] - typ[b.type];
    })
    .slice(0, 5)
    .map((fi) => fi.recommendation);
}

function generateSummary(categories: Category[], score: number, pageType: PageType): string {
  const errors = categories.reduce((a, c) => a + c.findings.filter((f) => f.type === "error").length, 0);
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];
  const strongest = [...categories].sort((a, b) => b.score - a.score)[0];

  let s = `Din ${pageType} scorer ${score}/100 i CRO-analysen. `;
  if (errors > 0) s += `${errors} kritisk(e) problem(er) bør løses først. `;
  s += `Stærkeste: ${strongest.name} (${strongest.score}/100). `;
  s += `Størst potentiale: ${weakest.name} (${weakest.score}/100).`;
  return s;
}

// ─── Technical Health Builder ────────────────────────────────────

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function cwvRating(metric: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000], FCP: [1800, 3000], TBT: [200, 600],
    CLS: [0.1, 0.25], SI: [3400, 5800], TTFB: [800, 1800],
  };
  const t = thresholds[metric];
  if (!t) return "good";
  return value <= t[0] ? "good" : value <= t[1] ? "needs-improvement" : "poor";
}

const CWV_INFO: Record<string, { fullName: string; explanation: string; howToFix: string[] }> = {
  LCP: {
    fullName: "Largest Contentful Paint",
    explanation: "Måler hvornår det største synlige element (billede/tekstblok) er indlæst. Det er den vigtigste metrik for brugerens oplevelse af loadtid.",
    howToFix: ["Optimer hero-billeder: brug WebP/AVIF-format og passende størrelse", "Preload vigtigste billede med <link rel=\"preload\">", "Reducer render-blocking CSS/JS", "Brug CDN til statiske filer", "Implementér server-side caching og komprimering (gzip/brotli)"],
  },
  FCP: {
    fullName: "First Contentful Paint",
    explanation: "Måler hvornår den første tekst eller det første billede vises. Brugerens første visuelle signal om at siden loader.",
    howToFix: ["Reducer server-responstid (TTFB)", "Eliminér render-blocking ressourcer (defer/async JS, critical CSS inline)", "Minificér HTML, CSS og JavaScript", "Brug font-display: swap for webfonts"],
  },
  TBT: {
    fullName: "Total Blocking Time",
    explanation: "Samlet tid hvor main thread er blokeret. Høj TBT = siden føles langsom og uresponsiv.",
    howToFix: ["Reducer og opsplit store JavaScript-bundles med code splitting", "Fjern eller udskyd unødvendige tredjepartsscripts", "Brug web workers til tunge beregninger", "Lazy-load komponenter under fold"],
  },
  CLS: {
    fullName: "Cumulative Layout Shift",
    explanation: "Måler hvor meget sidens layout 'hopper' under indlæsning. Højt CLS frustrerer brugeren.",
    howToFix: ["Sæt altid width/height på billeder og videoer", "Reservér plads til annoncer og embeds", "Undgå at indsætte indhold dynamisk over eksisterende", "Brug font-display: optional eller swap + preload"],
  },
  SI: {
    fullName: "Speed Index",
    explanation: "Måler hvor hurtigt indholdet visuelt bliver synligt. Lavere = hurtigere opfattet loadtid.",
    howToFix: ["Prioritér synligt indhold above the fold", "Optimer kritisk rendering path (inline critical CSS)", "Reducer render-blocking tredjepartsscripts", "Brug progressive rendering og skeleton screens"],
  },
  TTFB: {
    fullName: "Time to First Byte",
    explanation: "Tiden fra brugerens request til serveren sender den første byte. Mål for serverens hastighed.",
    howToFix: ["Aktivér server-side caching (Redis, Varnish, CDN edge caching)", "Optimer databaseforespørgsler", "Brug CDN tæt på brugerne", "Overvej statisk generering (SSG)"],
  },
};

function buildSpeedData(ps: PageSpeedData): SpeedData {
  const cwv = (key: string, val: number, threshStr: string): CWVMetric => {
    const info = CWV_INFO[key] || { fullName: key, explanation: "", howToFix: [] };
    return {
      metric: key, fullName: info.fullName,
      value: key === "CLS" ? val.toFixed(3) : fmtMs(val),
      rating: cwvRating(key, val), threshold: threshStr,
      explanation: info.explanation, howToFix: info.howToFix,
    };
  };

  return {
    performanceScore: ps.performanceScore,
    accessibilityScore: ps.accessibilityScore,
    bestPracticesScore: ps.bestPracticesScore,
    seoScore: ps.seoScore,
    coreWebVitals: [
      cwv("LCP", ps.lcp, "≤ 2.5 s"), cwv("FCP", ps.fcp, "≤ 1.8 s"),
      cwv("TBT", ps.tbt, "≤ 200 ms"), cwv("CLS", ps.cls, "≤ 0.1"),
      cwv("SI", ps.si, "≤ 3.4 s"), cwv("TTFB", ps.ttfb, "≤ 800 ms"),
    ],
    opportunities: ps.opportunities.map((o) => ({ title: o.title, displayValue: o.displayValue, description: o.description })),
    diagnostics: ps.diagnostics.map((d) => ({ title: d.title, displayValue: d.displayValue, description: d.description })),
    a11yIssues: ps.a11yIssues.map((a) => ({ title: a.title, description: a.description, displayValue: a.displayValue })),
    seoIssues: ps.seoIssues.map((s) => ({ title: s.title, description: s.description, displayValue: s.displayValue })),
    bestPracticeIssues: ps.bestPracticeIssues.map((b) => ({ title: b.title, description: b.description, displayValue: b.displayValue })),
    passedCount: ps.passedAudits.length,
  };
}

function buildSecurityAudit(data: ScrapedData, sec: SecurityHeadersData | null, isHttps: boolean): SecurityAudit {
  const checks: SecurityCheck[] = [];
  const ss = data.securitySignals;

  // ── 1. Transport & Kryptering ──
  checks.push({ category: "Transport & Kryptering", label: "HTTPS aktiveret", status: isHttps ? "pass" : "fail", value: isHttps ? "Ja" : "Nej", risk: isHttps ? "none" : "high", detail: isHttps ? "Siden kører over HTTPS." : "Siden kører IKKE over HTTPS. Kritisk for sikkerhed, SEO og brugertillid.", howToFix: isHttps ? undefined : "Aktivér SSL-certifikat via din hosting-udbyder eller Cloudflare (gratis)." });
  if (ss.mixedContentUrls.length > 0) {
    checks.push({ category: "Transport & Kryptering", label: "Mixed content", status: "fail", value: `${ss.mixedContentUrls.length} HTTP-ressourcer på HTTPS-side`, risk: "medium", detail: `Fundet: ${ss.mixedContentUrls.slice(0, 3).join(", ")}`, howToFix: "Ret alle http:// URL'er til https:// i HTML, CSS og JS." });
  } else {
    checks.push({ category: "Transport & Kryptering", label: "Mixed content", status: "pass", value: "Ingen fundet", risk: "none" });
  }
  if (sec) {
    checks.push({ category: "Transport & Kryptering", label: "HSTS header", status: sec.hasHSTS ? "pass" : "fail", value: sec.hasHSTS ? `Aktiveret (max-age: ${sec.hstsMaxAge})` : "Mangler", risk: sec.hasHSTS ? "none" : "high", howToFix: sec.hasHSTS ? undefined : "Tilføj header: Strict-Transport-Security: max-age=31536000; includeSubDomains" });
    checks.push({ category: "Transport & Kryptering", label: "TLS version", status: "info", value: sec.tlsVersion, risk: "none" });
  }

  // ── 2. Security Headers ──
  if (sec) {
    checks.push({ category: "Security Headers", label: "Content-Security-Policy", status: sec.hasCSP ? "pass" : "fail", value: sec.hasCSP ? "Aktiveret" : "Mangler", risk: sec.hasCSP ? "none" : "high", detail: sec.hasCSP ? `Policy: ${sec.cspValue.slice(0, 100)}...` : "CSP beskytter mod XSS og code injection-angreb.", howToFix: sec.hasCSP ? undefined : "Tilføj Content-Security-Policy header. Start med: default-src 'self'; script-src 'self'" });
    checks.push({ category: "Security Headers", label: "X-Frame-Options", status: sec.hasXFrameOptions ? "pass" : "fail", value: sec.hasXFrameOptions ? "Aktiveret" : "Mangler", risk: sec.hasXFrameOptions ? "none" : "medium", howToFix: sec.hasXFrameOptions ? undefined : "Tilføj: X-Frame-Options: SAMEORIGIN for at forhindre clickjacking." });
    checks.push({ category: "Security Headers", label: "X-Content-Type-Options", status: sec.hasXContentTypeOptions ? "pass" : "fail", value: sec.hasXContentTypeOptions ? "nosniff" : "Mangler", risk: sec.hasXContentTypeOptions ? "none" : "medium", howToFix: sec.hasXContentTypeOptions ? undefined : "Tilføj: X-Content-Type-Options: nosniff" });
    checks.push({ category: "Security Headers", label: "Referrer-Policy", status: sec.hasReferrerPolicy ? "pass" : "warning", value: sec.hasReferrerPolicy ? sec.referrerPolicyValue : "Mangler", risk: sec.hasReferrerPolicy ? "none" : "low", howToFix: sec.hasReferrerPolicy ? undefined : "Tilføj: Referrer-Policy: strict-origin-when-cross-origin" });
    checks.push({ category: "Security Headers", label: "Permissions-Policy", status: sec.hasPermissionsPolicy ? "pass" : "warning", value: sec.hasPermissionsPolicy ? "Aktiveret" : "Mangler", risk: sec.hasPermissionsPolicy ? "none" : "low", howToFix: sec.hasPermissionsPolicy ? undefined : "Tilføj Permissions-Policy header for at begrænse browser-API-adgang." });
    checks.push({ category: "Security Headers", label: "X-XSS-Protection", status: sec.hasXXSSProtection ? "pass" : "warning", value: sec.hasXXSSProtection ? "Aktiveret" : "Mangler", risk: sec.hasXXSSProtection ? "none" : "low" });
  }

  // ── 3. Cookie & Tracking Compliance ──
  checks.push({ category: "Cookie & GDPR", label: "Cookie-samtykke banner", status: data.uxSignals.hasCookieConsent ? "pass" : "fail", value: data.uxSignals.hasCookieConsent ? "Registreret" : "Ikke fundet", risk: data.uxSignals.hasCookieConsent ? "none" : "high", howToFix: data.uxSignals.hasCookieConsent ? undefined : "Implementér en CMP (fx Cookiebot, CookieYes) der blokerer tracking-scripts indtil samtykke." });
  checks.push({ category: "Cookie & GDPR", label: "Privatlivspolitik", status: ss.hasPrivacyPolicy ? "pass" : "fail", value: ss.hasPrivacyPolicy ? "Link fundet" : "Ikke fundet", risk: ss.hasPrivacyPolicy ? "none" : "high", howToFix: ss.hasPrivacyPolicy ? undefined : "Tilføj en side med privatlivspolitik og link til den fra footer." });
  checks.push({ category: "Cookie & GDPR", label: "Cookiepolitik", status: ss.hasCookiePolicy ? "pass" : "warning", value: ss.hasCookiePolicy ? "Link fundet" : "Ikke fundet", risk: ss.hasCookiePolicy ? "none" : "medium" });
  checks.push({ category: "Cookie & GDPR", label: "Handelsbetingelser", status: ss.hasTerms ? "pass" : "warning", value: ss.hasTerms ? "Link fundet" : "Ikke fundet", risk: ss.hasTerms ? "none" : "low" });
  checks.push({ category: "Cookie & GDPR", label: "Kontaktoplysninger", status: ss.hasContactInfo ? "pass" : "warning", value: ss.hasContactInfo ? "Fundet" : "Ikke fundet", risk: ss.hasContactInfo ? "none" : "medium" });
  checks.push({ category: "Cookie & GDPR", label: "CVR-nummer", status: ss.hasCVR ? "pass" : "warning", value: ss.hasCVR ? "Fundet" : "Ikke fundet", risk: ss.hasCVR ? "none" : "low", detail: "Dansk lovkrav for erhvervsdrivende." });

  // ── 4. Formular & Login-sikkerhed ──
  if (ss.hasLoginForm) {
    checks.push({ category: "Formular-sikkerhed", label: "Login-formular fundet", status: "info", value: "Ja", risk: "none", detail: "Tjek at rate limiting, 2FA og password-krav er implementeret." });
  }
  checks.push({ category: "Formular-sikkerhed", label: "reCAPTCHA / spam-beskyttelse", status: ss.hasRecaptcha ? "pass" : "warning", value: ss.hasRecaptcha ? "Registreret" : "Ikke fundet", risk: ss.hasRecaptcha ? "none" : "medium", howToFix: ss.hasRecaptcha ? undefined : "Tilføj reCAPTCHA eller hCaptcha på formularer for at forhindre spam." });
  if (ss.exposedEmails.length > 0) {
    checks.push({ category: "Formular-sikkerhed", label: "Eksponerede e-mails", status: "warning", value: `${ss.exposedEmails.length} fundet i klar tekst`, risk: "medium", detail: ss.exposedEmails.join(", "), howToFix: "Brug en kontaktformular i stedet for at vise e-mails direkte — det forhindrer spam-bots." });
  }

  // ── 5. Server & Infrastruktur ──
  if (sec) {
    if (sec.serverHeader) {
      checks.push({ category: "Server & Infrastruktur", label: "Server-type eksponeret", status: "warning", value: sec.serverHeader, risk: "medium", howToFix: "Fjern eller skjul Server-headeren for at undgå fingerprinting. I Nginx: server_tokens off;" });
    } else {
      checks.push({ category: "Server & Infrastruktur", label: "Server-type eksponeret", status: "pass", value: "Skjult", risk: "none" });
    }
    if (sec.poweredByHeader) {
      checks.push({ category: "Server & Infrastruktur", label: "X-Powered-By eksponeret", status: "warning", value: sec.poweredByHeader, risk: "medium", howToFix: "Fjern X-Powered-By header. I Express: app.disable('x-powered-by')" });
    }
    checks.push({ category: "Server & Infrastruktur", label: "Komprimering (Gzip/Brotli)", status: sec.hasGzip || sec.hasBrotli ? "pass" : "warning", value: sec.hasBrotli ? "Brotli" : sec.hasGzip ? "Gzip" : "Ikke aktiveret", risk: sec.hasGzip || sec.hasBrotli ? "none" : "medium", howToFix: !(sec.hasGzip || sec.hasBrotli) ? "Aktivér gzip eller brotli-komprimering på serveren for at reducere sidestørrelse 60-80%." : undefined });
    checks.push({ category: "Server & Infrastruktur", label: "Cache-Control header", status: sec.hasCacheControl ? "pass" : "warning", value: sec.hasCacheControl ? sec.cacheControlValue.slice(0, 60) : "Mangler", risk: sec.hasCacheControl ? "none" : "medium" });
    if (sec.robotsTxtContent !== null) {
      const hasDisallowAdmin = /disallow:.*\/(wp-)?admin/i.test(sec.robotsTxtContent);
      checks.push({ category: "Server & Infrastruktur", label: "robots.txt", status: "pass", value: "Fundet", risk: "none", detail: hasDisallowAdmin ? "Admin-sider er korrekt blokeret." : "Overvej at blokere admin-sider med Disallow." });
    } else {
      checks.push({ category: "Server & Infrastruktur", label: "robots.txt", status: "warning", value: "Ikke fundet", risk: "low", howToFix: "Opret en robots.txt fil i roden af dit domæne." });
    }
  }
  if (ss.adminLinks.length > 0) {
    checks.push({ category: "Server & Infrastruktur", label: "Admin-login synlig", status: "warning", value: `${ss.adminLinks.length} link(s) fundet`, risk: "medium", detail: ss.adminLinks.join(", "), howToFix: "Flyt eller skjul admin-login URL. Brug et plugin til at ændre login-stien." });
  }

  // ── 6. Script-sikkerhed ──
  if (ss.scriptsWithoutSRI.length > 0) {
    checks.push({ category: "Script-sikkerhed", label: "CDN-scripts uden SRI", status: "warning", value: `${ss.scriptsWithoutSRI.length} scripts uden integrity-hash`, risk: "medium", detail: ss.scriptsWithoutSRI.slice(0, 3).join(", "), howToFix: "Tilføj integrity og crossorigin attributter til eksterne scripts for Subresource Integrity (SRI)." });
  } else if (ss.scriptsWithSRI > 0) {
    checks.push({ category: "Script-sikkerhed", label: "Subresource Integrity (SRI)", status: "pass", value: `${ss.scriptsWithSRI} scripts med integrity-hash`, risk: "none" });
  }
  if (ss.jqueryVersion) {
    const majorMinor = ss.jqueryVersion.split(".").map(Number);
    const isOld = majorMinor[0] < 3 || (majorMinor[0] === 3 && majorMinor[1] < 5);
    checks.push({ category: "Script-sikkerhed", label: "jQuery version", status: isOld ? "warning" : "pass", value: `jQuery ${ss.jqueryVersion}`, risk: isOld ? "medium" : "none", detail: isOld ? "Forældet jQuery-version kan have kendte sikkerhedssårbarheder." : undefined, howToFix: isOld ? "Opdatér til jQuery 3.7+ eller fjern jQuery-afhængigheden helt." : undefined });
  }

  // ── 7. UX-sikkerhed ──
  if (ss.hasAggressivePopups) {
    checks.push({ category: "UX-sikkerhed", label: "Aggressive popups/overlays", status: "warning", value: "Flere fundet", risk: "medium", howToFix: "Reducer antallet af popups. Google straffer intrusive interstitials på mobil." });
  }

  // ── 8. E-commerce ──
  if (data.structuralInfo.hasAddToCart || data.structuralInfo.hasCartWidget) {
    checks.push({ category: "E-commerce sikkerhed", label: "Secure checkout-badge", status: ss.hasSecureCheckoutBadge ? "pass" : "warning", value: ss.hasSecureCheckoutBadge ? "Fundet" : "Ikke fundet", risk: ss.hasSecureCheckoutBadge ? "none" : "medium", howToFix: ss.hasSecureCheckoutBadge ? undefined : "Tilføj synlige 'Sikker betaling'-badges tæt på checkout for at øge tillid." });
  }

  // ── Score calculation ──
  const highRisks = checks.filter((c) => c.risk === "high").length;
  const medRisks = checks.filter((c) => c.risk === "medium").length;
  const totalChecks = checks.filter((c) => c.status !== "info").length;
  const passed = checks.filter((c) => c.status === "pass").length;

  const securityScore = totalChecks > 0 ? Math.max(0, Math.min(100, Math.round((passed / totalChecks) * 100))) : 0;
  const privacyChecks = checks.filter((c) => c.category === "Cookie & GDPR");
  const privacyPassed = privacyChecks.filter((c) => c.status === "pass").length;
  const privacyScore = privacyChecks.length > 0 ? Math.round((privacyPassed / privacyChecks.length) * 100) : 0;
  const infraChecks = checks.filter((c) => c.category === "Server & Infrastruktur" || c.category === "Transport & Kryptering");
  const infraPassed = infraChecks.filter((c) => c.status === "pass").length;
  const infraScore = infraChecks.length > 0 ? Math.round((infraPassed / infraChecks.length) * 100) : 0;

  const overallRisk: "low" | "medium" | "high" | "critical" =
    highRisks >= 3 ? "critical" : highRisks >= 1 ? "high" : medRisks >= 3 ? "medium" : "low";

  const categoryMap = new Map<string, SecurityCheck[]>();
  for (const c of checks) {
    if (!categoryMap.has(c.category)) categoryMap.set(c.category, []);
    categoryMap.get(c.category)!.push(c);
  }

  const catIcons: Record<string, string> = {
    "Transport & Kryptering": "🔒", "Security Headers": "🛡️", "Cookie & GDPR": "🍪",
    "Formular-sikkerhed": "📝", "Server & Infrastruktur": "⚙️", "Script-sikkerhed": "📜",
    "UX-sikkerhed": "👁️", "E-commerce sikkerhed": "🛒",
  };

  const categories = Array.from(categoryMap.entries()).map(([name, chks]) => ({
    name, icon: catIcons[name] || "🔍", checks: chks,
  }));

  return { securityScore, privacyScore, infrastructureScore: infraScore, overallRisk, categories };
}

function buildTechnicalHealth(data: ScrapedData, psDesktop: PageSpeedData | null, psMobile: PageSpeedData | null, secHeaders: SecurityHeadersData | null): TechnicalHealth | null {
  const isHttps = data.url.startsWith("https");
  const desktop = psDesktop ? buildSpeedData(psDesktop) : null;
  const mobile = psMobile ? buildSpeedData(psMobile) : null;
  const security = buildSecurityAudit(data, secHeaders, isHttps);

  if (!desktop && !mobile && security.securityScore === 0) return null;
  return { desktop, mobile, security };
}

// ─── Main ───────────────────────────────────────────────────────

export function analyzeWebsite(
  data: ScrapedData,
  pageSpeedDesktop: PageSpeedData | null = null,
  pageSpeedMobile: PageSpeedData | null = null,
  securityHeaders: SecurityHeadersData | null = null,
): AnalysisResult {
  const pageType = detectPageType(data);
  const ctx: AnalysisContext = { data, pageType, pageSpeed: pageSpeedDesktop || pageSpeedMobile, pageSpeedDesktop, pageSpeedMobile };

  const categories: Category[] = [
    analyzeAboveTheFold(ctx),
    analyzeCTA(ctx),
    analyzeTrust(ctx),
    analyzeContent(ctx),
    analyzeNavigation(ctx),
    analyzeDesignUX(ctx),
    analyzePerformance(ctx),
    analyzeConversion(ctx),
    analyzeFriction(ctx),
  ];

  const overallScore = Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length);
  const abTestIdeas = generateABTestIdeas(ctx, categories);
  const benchmark = generateBenchmark(ctx, categories, overallScore);
  const technicalHealth = buildTechnicalHealth(data, pageSpeedDesktop, pageSpeedMobile, securityHeaders);

  return {
    overallScore,
    pageType,
    summary: generateSummary(categories, overallScore, pageType),
    categories,
    quickWins: generateQuickWins(categories),
    prioritizedActions: generatePrioritizedActions(categories),
    abTestIdeas,
    benchmark,
    technicalHealth,
  };
}

// ─── A/B Test Ideas (dynamic, concrete, based on scraped data) ──

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function generateABTestIdeas(ctx: AnalysisContext, categories: Category[]): ABTestIdea[] {
  const { data, pageType } = ctx;
  const ideas: (Omit<ABTestIdea, "id"> & { _priority: number })[] = [];
  const errorCategories = new Set(categories.filter((c) => c.score < 60).map((c) => c.name));

  const h1 = data.headings.find((h) => h.tag === "h1")?.text?.trim() || "";
  const heroText = data.firstScreenContent.heroText?.trim() || h1;
  const heroSub = data.firstScreenContent.heroSubtext?.trim() || "";
  const primaryCta = data.ctas.find((c) => c.isPrimary)?.text?.trim() || data.ctas[0]?.text?.trim() || "";
  const allCtaTexts = data.ctas.map((c) => c.text.trim()).filter(Boolean);
  const usps = data.copyAnalysis.usps;
  const benefits = data.copyAnalysis.benefitStatements;
  const navCount = data.structuralInfo.navItemCount;

  function pri(base: number, cat: string): number {
    const catName = ANALYSIS_CATEGORIES.find((c) => c.key === cat)?.name;
    return base + (catName && errorCategories.has(catName) ? 5 : 0);
  }

  // ── Headlines (only when we have actual headline data) ──
  if (heroText) {
    const words = heroText.split(/\s+/);
    ideas.push({
      title: "Headline: Benefit-fokuseret",
      hypothesis: "En headline der starter med kundens udbytte konverterer bedre end en der beskriver produktet",
      variantA: `"${truncate(heroText, 80)}"`,
      variantB: `"Opnå [primær fordel] med ${truncate(heroText.split(" ").slice(-2).join(" "), 30)} – uden besvær"`,
      metric: "Konverteringsrate / engagement",
      expectedImpact: "high", category: "above-the-fold", pageTypes: [pageType], _priority: pri(8, "above-the-fold"),
    });
    if (words.length > 8) {
      ideas.push({
        title: "Headline: Kortere & mere punchy",
        hypothesis: `Din headline er ${words.length} ord – en kortere version (5-8 ord) fanger hurtigere`,
        variantA: `"${truncate(heroText, 80)}"`,
        variantB: `"${truncate(words.slice(0, 6).join(" "), 60)}"`,
        metric: "Bounce rate / engagement",
        expectedImpact: "medium", category: "above-the-fold", pageTypes: [pageType], _priority: pri(5, "above-the-fold"),
      });
    }
    ideas.push({
      title: "Headline: Spørgsmål vs. påstand",
      hypothesis: "Et spørgsmål der rammer kundens smertepunkt skaber mere engagement end en påstand",
      variantA: `"${truncate(heroText, 80)}"`,
      variantB: `"Kæmper du med [det problem din målgruppe har]? – Prøv ${data.title.split(" ")[0] || "vores løsning"}"`,
      metric: "Scroll depth / CTA-klik",
      expectedImpact: "medium", category: "above-the-fold", pageTypes: [pageType], _priority: pri(5, "above-the-fold"),
    });
    ideas.push({
      title: "Headline: Med socialt bevis",
      hypothesis: "Et tal/socialt bevis i headline øger troværdighed ('Brugt af 2.000+ virksomheder')",
      variantA: `"${truncate(heroText, 80)}"`,
      variantB: `"${truncate(heroText, 50)} – Valgt af [X]+ kunder"`,
      metric: "Tid på side / konverteringsrate",
      expectedImpact: "high", category: "above-the-fold", pageTypes: [pageType], _priority: pri(7, "above-the-fold"),
    });
  }

  // Subheadline
  if (!heroSub && heroText) {
    ideas.push({
      title: "Tilføj underoverskrift",
      hypothesis: "En underoverskrift der uddyber value prop øger forståelsen og reducerer bounce",
      variantA: `Kun headline: "${truncate(heroText, 60)}" (ingen underoverskrift)`,
      variantB: `Headline + underoverskrift: "${truncate(heroText, 40)}" + "Vi hjælper [målgruppe] med at [opnå resultat] – hurtigt og nemt"`,
      metric: "Konverteringsrate / bounce rate",
      expectedImpact: "medium", category: "above-the-fold", pageTypes: [pageType], _priority: pri(5, "above-the-fold"),
    });
  }

  // ── CTA (always concrete) ──
  if (primaryCta) {
    const isGeneric = /^(læs mere|klik her|se mere|learn more|read more|click here|submit|send)$/i.test(primaryCta);
    if (isGeneric) {
      ideas.push({
        title: "CTA: Specifik handlingstekst",
        hypothesis: `"${primaryCta}" er for generisk – en specifik CTA konverterer 20-30% bedre`,
        variantA: `"${primaryCta}"`,
        variantB: pageType === "produktside" ? `"Tilføj til kurv – Fri fragt i dag"` : `"Se vores udvalg" eller "Få gratis tilbud nu"`,
        metric: "CTR på CTA",
        expectedImpact: "high", category: "cta", pageTypes: [pageType], _priority: pri(9, "cta"),
      });
    }
    ideas.push({
      title: "CTA: Med benefit-tekst",
      hypothesis: "En CTA der kommunikerer en fordel konverterer bedre end en uden",
      variantA: `"${truncate(primaryCta, 40)}"`,
      variantB: `"${truncate(primaryCta, 25)} – ${usps[0] || "Gratis levering"}"`,
      metric: "CTR / konverteringsrate",
      expectedImpact: "high", category: "cta", pageTypes: [pageType], _priority: pri(8, "cta"),
    });
  }

  if (allCtaTexts.length <= 1) {
    ideas.push({
      title: "CTA: Gentag 2-3 gange på siden",
      hypothesis: "Kun 1 CTA på siden – gentagelse af CTA (hero, midt, bund) øger konvertering jf. gentagelsesloven",
      variantA: `Kun 1 CTA: "${truncate(primaryCta || "primær CTA", 40)}"`,
      variantB: `CTA gentaget 3 steder: efter hero, efter social proof, og før footer`,
      metric: "Konverteringsrate",
      expectedImpact: "medium", category: "cta", pageTypes: [pageType], _priority: pri(6, "cta"),
    });
  }

  if (data.ctas.every((c) => !c.isAboveFold)) {
    ideas.push({
      title: "CTA: Flyt above the fold",
      hypothesis: "Ingen CTA er synlig uden scrolling – flytning til above the fold kan øge konvertering markant",
      variantA: `CTA "${truncate(primaryCta || "primær CTA", 30)}" placeret under fold`,
      variantB: `CTA flyttet direkte under headline/hero-sektion`,
      metric: "Konverteringsrate",
      expectedImpact: "high", category: "cta", pageTypes: [pageType], _priority: pri(9, "cta"),
    });
  }

  if (pageType === "produktside") {
    ideas.push({
      title: "Sticky CTA på mobil",
      hypothesis: "En fast CTA-bar i bunden holder købsmuligheden synlig ved scroll",
      variantA: `CTA "${truncate(primaryCta || "Læg i kurv", 30)}" scroller med indholdet`,
      variantB: `Sticky bar i bunden: pris + "${truncate(primaryCta || "Køb nu", 20)}" altid synlig`,
      metric: "Mobil konverteringsrate",
      expectedImpact: "high", category: "cta", pageTypes: [pageType], _priority: pri(7, "cta"),
    });
  }

  // ── Social Proof ──
  const hasTrustpilot = data.trustSignals.some((t) => /trustpilot/i.test(t.description));
  if (!hasTrustpilot) {
    ideas.push({
      title: "Tilføj Trustpilot-widget",
      hypothesis: "En Trustpilot-score above the fold øger tillid og konvertering med op til 15%",
      variantA: "Ingen Trustpilot-widget synlig",
      variantB: `Trustpilot-widget med score (fx "⭐ 4.7/5 baseret på 324 anmeldelser") under headline`,
      metric: "Konverteringsrate / bounce rate",
      expectedImpact: "high", category: "social-proof", pageTypes: [pageType], _priority: pri(8, "social-proof"),
    });
  }

  if (!data.firstScreenContent.hasSocialProofAboveFold) {
    ideas.push({
      title: "Social proof above the fold",
      hypothesis: "Social proof placeret tidligt i viewport øger tillid fra første sekund",
      variantA: "Ingen social proof synlig above the fold",
      variantB: `Tilføj en linje under headline: "Betroet af [X]+ kunder" eller "⭐ 4.8/5 på Trustpilot"`,
      metric: "Bounce rate / konverteringsrate",
      expectedImpact: "medium", category: "social-proof", pageTypes: [pageType], _priority: pri(6, "social-proof"),
    });
  }

  if (pageType === "produktside" || pageType === "checkout") {
    ideas.push({
      title: "Trust badges tæt på CTA",
      hypothesis: "Trust badges (sikkerhedscertifikater, betalingsikoner) direkte ved CTA reducerer købs-angst",
      variantA: `Trust badges kun i footer / ikke synlige nær "${truncate(primaryCta || "Køb nu", 20)}"`,
      variantB: `Betalingsikoner (MobilePay, Visa, Mastercard) + "🔒 Sikker betaling" direkte under CTA`,
      metric: "Konverteringsrate",
      expectedImpact: "high", category: "social-proof", pageTypes: [pageType], _priority: pri(8, "social-proof"),
    });
  }

  // ── Content & Copy ──
  if (usps.length === 0) {
    ideas.push({
      title: "USP-bar: Tilføj synlige fordele",
      hypothesis: "3-5 tydelige USP'er under header øger opfattet værdi og reducerer bounce",
      variantA: "Ingen USP-bar synlig",
      variantB: `USP-bar med ikoner: "✓ Fri fragt ✓ 30 dages retur ✓ Dansk support ✓ Hurtig levering"`,
      metric: "Bounce rate / konverteringsrate",
      expectedImpact: "high", category: "content", pageTypes: [pageType], _priority: pri(8, "content"),
    });
  } else if (usps.length > 0) {
    ideas.push({
      title: "USP-bar: Omformulér til benefits",
      hypothesis: "USP'er formuleret som kundefordele konverterer bedre end features",
      variantA: `Nuværende USP'er: "${usps.slice(0, 3).map((u) => truncate(u, 30)).join('" | "')}"`,
      variantB: `Benefit-fokuseret: "Spar tid med [feature]" | "Tryg handel – 30 dages retur" | "Gratis fragt over 499 kr"`,
      metric: "Konverteringsrate",
      expectedImpact: "medium", category: "content", pageTypes: [pageType], _priority: pri(5, "content"),
    });
  }

  if (benefits.length === 0 && pageType === "produktside") {
    ideas.push({
      title: "Produktbeskrivelse: Benefits first",
      hypothesis: "Kunder køber fordele, ikke features – en benefit-first beskrivelse konverterer bedre",
      variantA: `Nuværende feature-beskrivelse (ingen tydelige benefits fundet)`,
      variantB: `Start med: "Det får du: ✓ [fordel 1] ✓ [fordel 2] ✓ [fordel 3]" – derefter features som understøttende`,
      metric: "Add-to-cart rate",
      expectedImpact: "high", category: "content", pageTypes: [pageType], _priority: pri(8, "content"),
    });
  }

  if (!data.structuralInfo.hasFAQ) {
    ideas.push({
      title: "Tilføj FAQ-sektion",
      hypothesis: "En FAQ adresserer tvivl og reducerer barrierer – typisk 5-10% konverteringsløft",
      variantA: "Ingen FAQ synlig på siden",
      variantB: `FAQ med 5 spørgsmål: "Hvad er leverings-tiden?", "Kan jeg returnere?", "Hvordan betaler jeg?", "Er det sikkert?", "Hvem er I?"`,
      metric: "Konverteringsrate / support-henvendelser",
      expectedImpact: "medium", category: "content", pageTypes: [pageType], _priority: pri(5, "content"),
    });
  }

  // ── Navigation ──
  if (navCount > 7) {
    ideas.push({
      title: `Navigation: Reducer fra ${navCount} til max 7 menupunkter`,
      hypothesis: "For mange menupunkter overbelaster – Hick's Law siger færre valg = hurtigere beslutning",
      variantA: `${navCount} menupunkter i navigation`,
      variantB: `5-7 primære punkter + "Mere" dropdown for resten`,
      metric: "Navigation-klik / bounce rate",
      expectedImpact: "medium", category: "navigation", pageTypes: [pageType], _priority: pri(5, "navigation"),
    });
  }

  if (!data.structuralInfo.hasBreadcrumbs && (pageType === "produktside" || pageType === "kollektionsside")) {
    ideas.push({
      title: "Tilføj breadcrumbs",
      hypothesis: "Breadcrumbs forbedrer navigation og reducerer bounce – plus SEO-fordele",
      variantA: "Ingen breadcrumbs",
      variantB: `Breadcrumbs: "Forside > [Kategori] > [Sidenavn]"`,
      metric: "Bounce rate / sider per session",
      expectedImpact: "low", category: "navigation", pageTypes: [pageType], _priority: pri(3, "navigation"),
    });
  }

  // ── Konvertering ──
  if (data.copyAnalysis.urgencyElements.length === 0) {
    ideas.push({
      title: "Urgency: Tilføj tidsbegrænset tilbud",
      hypothesis: "Urgency-elementer skaber FOMO og motiverer hurtigere handling",
      variantA: "Ingen urgency-elementer på siden",
      variantB: `Countdown timer: "Tilbud udløber om 02:34:15" eller "Bestil inden 14:00 for levering i morgen"`,
      metric: "Konverteringsrate",
      expectedImpact: "high", category: "conversion", pageTypes: [pageType], _priority: pri(7, "conversion"),
    });
  }

  if (pageType === "produktside" && !data.pageSignals.priceVisible) {
    ideas.push({
      title: "Prisvisning: Gør prisen synlig",
      hypothesis: "En tydeligt synlig pris reducerer usikkerhed – skjulte priser øger bounce",
      variantA: "Pris ikke umiddelbart synlig",
      variantB: `Stor, tydelig pris: "299 kr" (evt. med "Før: 399 kr – Spar 25%") direkte ved CTA`,
      metric: "Konverteringsrate",
      expectedImpact: "high", category: "conversion", pageTypes: [pageType], _priority: pri(9, "conversion"),
    });
  }

  ideas.push({
    title: "Exit-intent popup med tilbud",
    hypothesis: "En exit popup kan genvinde 5-15% af besøgende der er ved at forlade",
    variantA: "Ingen exit-intent popup",
    variantB: `Exit popup: "Vent! Få 10% rabat med koden EXIT10 – kun i dag" + email-felt`,
    metric: "Exit rate / konverteringsrate",
    expectedImpact: "medium", category: "conversion", pageTypes: [pageType], _priority: pri(5, "conversion"),
  });

  // ── Friktion ──
  const bigForm = data.forms.find((fo) => fo.fields > 5);
  if (bigForm) {
    ideas.push({
      title: `Formular: Reducer fra ${bigForm.fields} til 3-4 felter`,
      hypothesis: "Hvert ekstra felt reducerer completion rate med ~11% – drop alt der ikke er kritisk",
      variantA: `Formular med ${bigForm.fields} felter (typer: ${bigForm.fieldTypes.slice(0, 5).join(", ")})`,
      variantB: `Kun 3-4 felter: Navn, Email, ${bigForm.fieldTypes.includes("tel") ? "Telefon" : "Besked"} (+ evt. 1 felt)`,
      metric: "Form completion rate",
      expectedImpact: "high", category: "friction", pageTypes: [pageType], _priority: pri(9, "friction"),
    });
  }

  // ── Mobil ──
  ideas.push({
    title: "Mobil: Større tap targets",
    hypothesis: "Interaktive elementer under 44x44px giver fejlklik og frustration på mobil",
    variantA: "Nuværende knap-størrelser (muligvis for små)",
    variantB: "Alle knapper og links min. 44x44px med min. 8px afstand",
    metric: "Fejlklik / engagement",
    expectedImpact: "medium", category: "mobile", pageTypes: [pageType], _priority: pri(4, "mobile"),
  });

  return ideas
    .sort((a, b) => b._priority - a._priority)
    .slice(0, 15)
    .map(({ _priority, ...idea }, i) => ({ ...idea, id: i + 1 }));
}

// ─── Competitor / Industry Benchmarking ─────────────────────────

const INDUSTRY_BENCHMARKS: Record<string, { avg: number; top: number }> = {
  "Above the Fold": { avg: 55, top: 85 },
  "Call to Action": { avg: 50, top: 82 },
  "Social Proof & Tillid": { avg: 45, top: 80 },
  "Indhold & Copywriting": { avg: 52, top: 83 },
  "Navigation & Struktur": { avg: 60, top: 88 },
  "Visuelt Design & UX": { avg: 55, top: 85 },
  "Mobil & Performance": { avg: 48, top: 90 },
  "Konverteringselementer": { avg: 42, top: 78 },
  "Friktion & Barrierer": { avg: 58, top: 85 },
};

function generateBenchmark(
  ctx: AnalysisContext,
  categories: Category[],
  overallScore: number
): BenchmarkData {
  const comparisons: BenchmarkComparison[] = categories.map((cat) => {
    const bench = INDUSTRY_BENCHMARKS[cat.name] || { avg: 50, top: 80 };
    const status: BenchmarkComparison["status"] =
      cat.score >= bench.top ? "above" : cat.score >= bench.avg ? "at" : "below";

    let recommendation: string | undefined;
    if (status === "below") {
      recommendation = `Din score på ${cat.name} (${cat.score}) er under gennemsnittet (${bench.avg}). Fokusér på de kritiske fund i denne kategori.`;
    }

    return {
      metric: cat.name,
      yourValue: cat.score,
      industryAvg: bench.avg,
      topPerformers: bench.top,
      status,
      recommendation,
    };
  });

  // Overall position
  const avgTotal = Math.round(Object.values(INDUSTRY_BENCHMARKS).reduce((a, b) => a + b.avg, 0) / Object.keys(INDUSTRY_BENCHMARKS).length);
  const topTotal = Math.round(Object.values(INDUSTRY_BENCHMARKS).reduce((a, b) => a + b.top, 0) / Object.keys(INDUSTRY_BENCHMARKS).length);

  let overallPosition: string;
  if (overallScore >= topTotal) {
    overallPosition = "Top 10% – Din side performer bedre end de fleste konkurrenter.";
  } else if (overallScore >= avgTotal + 10) {
    overallPosition = "Over gennemsnit – Godt fundament, men der er stadig uudnyttet potentiale.";
  } else if (overallScore >= avgTotal) {
    overallPosition = "Gennemsnitlig – Du er på linje med branchen, men det er ikke nok til at skille dig ud.";
  } else {
    overallPosition = "Under gennemsnit – Der er betydeligt potentiale for forbedring sammenlignet med branchen.";
  }

  // PageSpeed benchmark
  if (ctx.pageSpeed) {
    comparisons.push({
      metric: "Lighthouse Score",
      yourValue: ctx.pageSpeed.performanceScore,
      industryAvg: 52,
      topPerformers: 92,
      status: ctx.pageSpeed.performanceScore >= 90 ? "above" : ctx.pageSpeed.performanceScore >= 52 ? "at" : "below",
      recommendation: ctx.pageSpeed.performanceScore < 52
        ? "Din Lighthouse-score er under gennemsnittet. Performance er en direkte ranking-faktor i Google."
        : undefined,
    });
  }

  const aboveCount = comparisons.filter((c) => c.status === "above").length;
  const belowCount = comparisons.filter((c) => c.status === "below").length;
  const industryContext = `Du scorer over branchen på ${aboveCount} af ${comparisons.length} parametre og under på ${belowCount}. ${
    belowCount > 3
      ? "Der er flere områder med stort forbedringspotentiale sammenlignet med konkurrenterne."
      : belowCount > 0
      ? "Fokusér på de områder hvor du scorer under gennemsnittet for at indhente konkurrenterne."
      : "Stærkt – du er foran branchen på de fleste parametre."
  }`;

  return { overallPosition, comparisons, industryContext };
}

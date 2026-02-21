import { ANALYSIS_CATEGORIES } from "./cro-knowledge";
import type { AnalysisResult, Finding, Category, QuickWin, ABTestIdea, BenchmarkData, BenchmarkComparison } from "./cro-knowledge";
import type { ScrapedData, PageSpeedData } from "./scraper";

// ─── Types ──────────────────────────────────────────────────────

type PageType = "forside" | "produktside" | "kollektionsside" | "kurv" | "checkout" | "landingsside" | "andet";

type AnalysisContext = {
  data: ScrapedData;
  pageType: PageType;
  pageSpeed: PageSpeedData | null;
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
  const { data, pageSpeed } = ctx;
  const findings: Finding[] = [];

  if (pageSpeed) {
    // Use real Lighthouse data
    const ps = pageSpeed;
    if (ps.performanceScore >= 90) {
      findings.push(f("success", `Lighthouse score: ${ps.performanceScore}/100`,
        `Fremragende performance-score fra Google PageSpeed Insights (${ps.strategy}).`, "", "high", "Friktionslov"));
    } else if (ps.performanceScore >= 50) {
      findings.push(f("warning", `Lighthouse score: ${ps.performanceScore}/100`,
        `Performance-scoren fra Google PageSpeed Insights er ${ps.performanceScore}/100 (${ps.strategy}). Under 90 er suboptimalt.`,
        "Fokusér på at reducere LCP (største billede/tekst), minimér JavaScript-bundler og optimer billeder til WebP/AVIF.",
        "high", "Friktionslov"));
    } else {
      findings.push(f("error", `Lighthouse score: ${ps.performanceScore}/100`,
        `Kritisk lav performance-score fra Google PageSpeed Insights (${ps.strategy}). Det påvirker både SEO-ranking og konverteringsrate.`,
        "Prioritér: 1) Optimer billeder (WebP, lazy-load) 2) Reducer render-blocking JS/CSS 3) Aktivér server-caching/CDN 4) Reducer tredjepartsscripts.",
        "high", "Friktionslov"));
    }

    // LCP
    if (ps.lcp > 0) {
      const lcpSec = (ps.lcp / 1000).toFixed(1);
      if (ps.lcp <= 2500) {
        findings.push(f("success", `LCP: ${lcpSec}s (god)`,
          `Largest Contentful Paint er ${lcpSec}s – under Googles anbefaling på 2.5s.`, "", "high", "Friktionslov"));
      } else if (ps.lcp <= 4000) {
        findings.push(f("warning", `LCP: ${lcpSec}s (behøver forbedring)`,
          `Largest Contentful Paint er ${lcpSec}s. Google anbefaler under 2.5s.`,
          "Optimer det største synlige element (typisk hero-billede): brug WebP/AVIF, preload det, og reducer dets filstørrelse.",
          "high", "Friktionslov"));
      } else {
        findings.push(f("error", `LCP: ${lcpSec}s (for langsomt)`,
          `Largest Contentful Paint er ${lcpSec}s – langt over Googles 2.5s anbefaling. Det koster konverteringer og SEO-ranking.`,
          "Akut: preload hero-billede, konverter til WebP, reducer JavaScript, overvej CDN. Hvert sekund over 3s mister du ~7% konverteringer.",
          "high", "Friktionslov"));
      }
    }

    // CLS
    if (ps.cls > 0.25) {
      findings.push(f("warning", `CLS: ${ps.cls.toFixed(3)} (layout-ustabilitet)`,
        "Elementer flytter sig mens siden loader. Det skaber dårlig brugeroplevelse og lavere SEO-score.",
        "Sæt faste width/height på billeder og embeds. Undgå at indsætte indhold dynamisk over eksisterende content.",
        "medium", "Friktionslov"));
    } else if (ps.cls >= 0) {
      findings.push(f("success", `CLS: ${ps.cls.toFixed(3)} (stabilt)`,
        "Layout er stabilt mens siden loader – god brugeroplevelse.", "", "medium", "Friktionslov"));
    }
  } else {
    // Fallback: use our own measurements
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

// ─── Main ───────────────────────────────────────────────────────

export function analyzeWebsite(data: ScrapedData, pageSpeed: PageSpeedData | null = null): AnalysisResult {
  const pageType = detectPageType(data);
  const ctx: AnalysisContext = { data, pageType, pageSpeed };

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

  return {
    overallScore,
    pageType,
    summary: generateSummary(categories, overallScore, pageType),
    categories,
    quickWins: generateQuickWins(categories),
    prioritizedActions: generatePrioritizedActions(categories),
    abTestIdeas,
    benchmark,
  };
}

// ─── A/B Test Ideas (60+ pool, context-filtered) ────────────────

const AB_TEST_POOL: Omit<ABTestIdea, "id">[] = [
  // ── Headlines ──
  { title: "Headline: Benefit vs. Feature", hypothesis: "En benefit-orienteret headline konverterer bedre end en feature-baseret", variantA: "Nuværende headline", variantB: "Headline med konkret kundefordel", metric: "Konverteringsrate / engagement", expectedImpact: "high", category: "above-the-fold", pageTypes: ["forside", "landingsside", "produktside"] },
  { title: "Headline: Specifik vs. Generisk", hypothesis: "Specifikke tal/resultater i headline øger troværdighed", variantA: "Nuværende headline", variantB: "Headline med specifikt tal/resultat (fx 'Spar 30%', '1.200+ tilfredse kunder')", metric: "Tid på side / CTA-klik", expectedImpact: "medium", category: "above-the-fold", pageTypes: ["forside", "landingsside"] },
  { title: "Headline: Spørgsmål vs. Påstand", hypothesis: "Et spørgsmål der adresserer kundens smertepunkt skaber mere engagement", variantA: "Nuværende påstand-headline", variantB: "Spørgsmåls-headline ('Træt af [problem]?')", metric: "Scroll depth / CTA-klik", expectedImpact: "medium", category: "above-the-fold", pageTypes: ["forside", "landingsside"] },
  { title: "Headline: Kort vs. Lang", hypothesis: "En kortere, punchier headline fanger opmærksomheden hurtigere", variantA: "Nuværende headline", variantB: "Forkortet version (max 6-8 ord)", metric: "Bounce rate / engagement", expectedImpact: "medium", category: "above-the-fold", pageTypes: ["forside", "landingsside"] },
  { title: "Underoverskrift: Med vs. Uden", hypothesis: "En underoverskrift der uddyber value prop øger forståelsen", variantA: "Uden underoverskrift", variantB: "Med underoverskrift der forklarer 'hvad + for hvem + hvorfor'", metric: "Konverteringsrate", expectedImpact: "medium", category: "above-the-fold", pageTypes: ["forside", "landingsside"] },

  // ── CTA ──
  { title: "CTA-tekst: Handlingsord vs. Generisk", hypothesis: "Specifikke handlingsord konverterer bedre end 'Læs mere'", variantA: "Generisk CTA ('Læs mere', 'Klik her')", variantB: "Specifik CTA ('Se vores udvalg', 'Få gratis tilbud')", metric: "CTR på CTA", expectedImpact: "high", category: "cta", pageTypes: ["forside", "landingsside", "produktside", "kollektionsside"] },
  { title: "CTA-tekst: Med benefit vs. Uden", hypothesis: "CTA med benefit i teksten øger klikrate", variantA: "'Køb nu'", variantB: "'Køb nu – Fri fragt i dag'", metric: "CTR / konverteringsrate", expectedImpact: "high", category: "cta", pageTypes: ["produktside"] },
  { title: "CTA-farve: Primær vs. Kontrastfarve", hypothesis: "Kontrastfarve der skiller sig ud øger synlighed og klik", variantA: "Nuværende CTA-farve", variantB: "Høj-kontrast farve der popper mod baggrunden", metric: "CTR på CTA", expectedImpact: "medium", category: "cta", pageTypes: ["forside", "landingsside", "produktside"] },
  { title: "CTA-størrelse: Større knap", hypothesis: "En 20% større CTA-knap øger klikrate, især på mobil", variantA: "Nuværende størrelse", variantB: "20% større med mere padding", metric: "CTR på CTA (mobil + desktop)", expectedImpact: "medium", category: "cta", pageTypes: ["forside", "landingsside", "produktside"] },
  { title: "CTA-placering: Above fold vs. After content", hypothesis: "CTA direkte efter value proposition konverterer bedre end længere nede", variantA: "CTA placeret under fold", variantB: "CTA flyttet til above the fold", metric: "Konverteringsrate", expectedImpact: "high", category: "cta", pageTypes: ["forside", "landingsside"] },
  { title: "Sticky CTA på mobil", hypothesis: "En fast CTA-knap i bunden af skærmen øger konvertering på mobil", variantA: "Normal CTA (scroller med)", variantB: "Sticky CTA i bunden af mobil-viewet", metric: "Mobil konverteringsrate", expectedImpact: "high", category: "cta", pageTypes: ["produktside", "landingsside"] },
  { title: "Antal CTAs: Én vs. Gentaget", hypothesis: "CTA gentaget 2-3 gange på siden øger konvertering (gentagelsesloven)", variantA: "Kun 1 CTA", variantB: "CTA gentaget efter hero, midt og bund", metric: "Konverteringsrate", expectedImpact: "medium", category: "cta", pageTypes: ["forside", "landingsside"] },
  { title: "CTA: 'Læg i kurv' vs. 'Køb nu'", hypothesis: "Direkte købs-sprog kan øge konvertering for impulskøb", variantA: "'Læg i kurv'", variantB: "'Køb nu'", metric: "Add-to-cart rate / konverteringsrate", expectedImpact: "medium", category: "cta", pageTypes: ["produktside"] },

  // ── Social Proof ──
  { title: "Trustpilot-widget: Med vs. Uden", hypothesis: "Synlig Trustpilot-score øger tillid og konvertering", variantA: "Uden Trustpilot", variantB: "Trustpilot-widget med score above the fold", metric: "Konverteringsrate / bounce rate", expectedImpact: "high", category: "social-proof", pageTypes: ["forside", "produktside", "landingsside"] },
  { title: "Kundecitater: Med foto vs. Uden", hypothesis: "Testimonials med billede virker mere troværdige", variantA: "Citat med kun tekst + navn", variantB: "Citat med foto, navn og titel", metric: "Engagement / konverteringsrate", expectedImpact: "medium", category: "social-proof", pageTypes: ["forside", "landingsside"] },
  { title: "Social proof placering: Header vs. Sektion", hypothesis: "'1.200+ tilfredse kunder' i header øger tillid fra første sekund", variantA: "Social proof i dedikeret sektion nede", variantB: "Kort social proof-linje direkte under headline", metric: "Bounce rate / konverteringsrate", expectedImpact: "medium", category: "social-proof", pageTypes: ["forside", "landingsside"] },
  { title: "Antal reviews synlige: Få vs. Mange", hypothesis: "At vise antal anmeldelser ('baseret på 847 anmeldelser') øger troværdighed", variantA: "Stjernerating uden antal", variantB: "Stjernerating + 'baseret på X anmeldelser'", metric: "Konverteringsrate", expectedImpact: "medium", category: "social-proof", pageTypes: ["produktside"] },
  { title: "Trust badges: Tæt på CTA vs. Footer", hypothesis: "Trust badges placeret direkte ved CTA reducerer købs-angst", variantA: "Trust badges kun i footer", variantB: "Trust badges lige under/ved CTA-knap", metric: "Konverteringsrate", expectedImpact: "high", category: "social-proof", pageTypes: ["produktside", "checkout"] },
  { title: "Logo-bar: Kendte brands/medier", hypothesis: "'Som set i...' eller partner-logoer øger autoritet", variantA: "Uden logo-bar", variantB: "Logo-bar med kendte brands/medier above the fold", metric: "Bounce rate / tillid", expectedImpact: "medium", category: "social-proof", pageTypes: ["forside", "landingsside"] },
  { title: "Garanti-badge design: Tekst vs. Visuelt", hypothesis: "Et visuelt garanti-badge med ikon konverterer bedre end ren tekst", variantA: "Tekst: '30 dages returret'", variantB: "Visuelt badge med ikon + '30 dages returret'", metric: "Konverteringsrate", expectedImpact: "medium", category: "social-proof", pageTypes: ["produktside"] },

  // ── Indhold & Copy ──
  { title: "Produktbeskrivelse: Benefits vs. Features", hypothesis: "Benefit-first beskrivelse konverterer bedre end feature-list", variantA: "Feature-fokuseret beskrivelse", variantB: "Benefit-first, derefter features som understøttende", metric: "Add-to-cart rate", expectedImpact: "high", category: "content", pageTypes: ["produktside"] },
  { title: "Copy-længde: Kort vs. Detaljeret", hypothesis: "Mere detaljeret copy med bullet points performer bedre for komplekse produkter", variantA: "Kort beskrivelse (2-3 linjer)", variantB: "Detaljeret med bullets, benefits og FAQ", metric: "Konverteringsrate / tid på side", expectedImpact: "medium", category: "content", pageTypes: ["produktside", "landingsside"] },
  { title: "Tone of voice: Formel vs. Uformel", hypothesis: "En mere personlig, uformel tone matcher bedre med din målgruppe", variantA: "Formel, professionel tone", variantB: "Uformel, personlig tone (du-form, hverdagssprog)", metric: "Engagement / konverteringsrate", expectedImpact: "medium", category: "content", pageTypes: ["forside", "landingsside"] },
  { title: "USP-bar: Med vs. Uden", hypothesis: "3-5 USP'er under header øger værdi-opfattelse", variantA: "Uden USP-bar", variantB: "USP-bar med ikoner: '✓ Fri fragt ✓ 30 dages retur ✓ Dansk support'", metric: "Bounce rate / konverteringsrate", expectedImpact: "high", category: "content", pageTypes: ["forside", "produktside", "kollektionsside"] },
  { title: "Produkt-USP'er: Over vs. Under fold", hypothesis: "USP'er synlige med det samme øger opfattet værdi", variantA: "USP'er under folden", variantB: "USP'er direkte under produktnavn/pris", metric: "Add-to-cart rate", expectedImpact: "medium", category: "content", pageTypes: ["produktside"] },
  { title: "'Sådan virker det' sektion", hypothesis: "En klar step-by-step proces reducerer usikkerhed", variantA: "Uden 'Sådan virker det'", variantB: "3-step visuelt flow: Vælg → Bestil → Modtag", metric: "Konverteringsrate / tid på side", expectedImpact: "medium", category: "content", pageTypes: ["forside", "landingsside"] },

  // ── Navigation & Struktur ──
  { title: "Menupunkter: Færre vs. Flere", hypothesis: "Reduceret navigation (max 5-7) giver mere fokus", variantA: "Nuværende antal menupunkter", variantB: "Reduceret til 5-7 primære + dropdown for resten", metric: "Navigation-klik / bounce rate", expectedImpact: "medium", category: "navigation", pageTypes: ["forside", "kollektionsside"] },
  { title: "Mega-menu vs. Simpel dropdown", hypothesis: "En visuelt rig mega-menu med billeder øger kategori-engagement", variantA: "Standard tekst-dropdown", variantB: "Mega-menu med kategori-billeder og bestsellers", metric: "Kategori-klik / sessioner per besøg", expectedImpact: "medium", category: "navigation", pageTypes: ["forside", "kollektionsside"] },
  { title: "Breadcrumbs: Med vs. Uden", hypothesis: "Breadcrumbs forbedrer navigation og reducerer bounce", variantA: "Uden breadcrumbs", variantB: "Breadcrumbs: 'Forside > Kategori > Produkt'", metric: "Bounce rate / sider per session", expectedImpact: "low", category: "navigation", pageTypes: ["produktside", "kollektionsside"] },
  { title: "Søgefelt: Prominent vs. Skjult", hypothesis: "Et synligt søgefelt øger produktfund og konvertering", variantA: "Søge-ikon (kræver klik)", variantB: "Åbent søgefelt i header med placeholder-tekst", metric: "Søge-brug / konverteringsrate", expectedImpact: "medium", category: "navigation", pageTypes: ["forside", "kollektionsside"] },

  // ── Design & UX ──
  { title: "Hero-billede: Produkt vs. Lifestyle", hypothesis: "Lifestyle-billede der viser produktet i brug performer bedre", variantA: "Produktbillede på hvid baggrund", variantB: "Lifestyle-foto med produktet i brug", metric: "Engagement / konverteringsrate", expectedImpact: "medium", category: "design", pageTypes: ["forside", "produktside", "landingsside"] },
  { title: "Hero: Statisk billede vs. Video", hypothesis: "En kort video above the fold øger engagement markant", variantA: "Statisk hero-billede", variantB: "15-30 sek. auto-play video (muted)", metric: "Tid på side / konverteringsrate", expectedImpact: "medium", category: "design", pageTypes: ["forside", "landingsside"] },
  { title: "Produktbilleder: Antal vinkler", hypothesis: "Flere produktbilleder (4-6 vinkler) reducerer usikkerhed", variantA: "1-2 produktbilleder", variantB: "4-6 billeder fra forskellige vinkler + zoom", metric: "Add-to-cart rate / returrate", expectedImpact: "high", category: "design", pageTypes: ["produktside"] },
  { title: "Baggrundsskift mellem sektioner", hypothesis: "Alternerende baggrundfarver gør indhold nemmere at scanne", variantA: "Ensartet baggrund hele vejen", variantB: "Skiftende lys/mørk baggrund per sektion", metric: "Scroll depth / engagement", expectedImpact: "low", category: "design", pageTypes: ["forside", "landingsside"] },
  { title: "Produktside layout: Billede størrelse", hypothesis: "Større produktbillede (60% af viewport) øger konvertering", variantA: "Nuværende billede-størrelse", variantB: "Billede udvidet til 60%+ af viewport-bredde", metric: "Add-to-cart rate", expectedImpact: "medium", category: "design", pageTypes: ["produktside"] },

  // ── Performance ──
  { title: "Lazy loading: Med vs. Uden", hypothesis: "Lazy loading af billeder under fold forbedrer initial loadtid", variantA: "Alle billeder loader med det samme", variantB: "Lazy loading på alle billeder under fold", metric: "LCP / konverteringsrate", expectedImpact: "high", category: "mobile", pageTypes: ["forside", "kollektionsside", "produktside"] },
  { title: "Billedformat: JPEG vs. WebP/AVIF", hypothesis: "Moderne billedformater reducerer filstørrelse med 30-50%", variantA: "JPEG/PNG billeder", variantB: "WebP/AVIF med fallback", metric: "Loadtid / Lighthouse score", expectedImpact: "medium", category: "mobile", pageTypes: ["forside", "kollektionsside", "produktside"] },

  // ── Konvertering ──
  { title: "Prisvisning: Besparelse synlig", hypothesis: "'Spar X kr' ved siden af prisen øger opfattet værdi", variantA: "Kun nuværende pris", variantB: "Førpris + nupris + 'Spar 25%'", metric: "Konverteringsrate", expectedImpact: "high", category: "conversion", pageTypes: ["produktside", "kollektionsside"] },
  { title: "Urgency: Countdown timer", hypothesis: "En countdown timer for tilbud skaber urgency der konverterer", variantA: "Ingen urgency-elementer", variantB: "Countdown timer: 'Tilbud udløber om X timer'", metric: "Konverteringsrate", expectedImpact: "high", category: "conversion", pageTypes: ["produktside", "landingsside"] },
  { title: "Lagerstatus: Synlig vs. Skjult", hypothesis: "'Kun 3 på lager' skaber scarcity og motiverer hurtig handling", variantA: "Ingen lagerstatus synlig", variantB: "'Kun X tilbage på lager' badge", metric: "Konverteringsrate / tid til køb", expectedImpact: "medium", category: "conversion", pageTypes: ["produktside"] },
  { title: "Leveringstid: Specifik vs. Generel", hypothesis: "'Levering torsdag d. 27.' konverterer bedre end '2-3 hverdage'", variantA: "'Levering i 2-3 hverdage'", variantB: "'Bestil inden 14:00 – leveret [specifik dag]'", metric: "Konverteringsrate", expectedImpact: "medium", category: "conversion", pageTypes: ["produktside"] },
  { title: "Gratis fragt tærskel: Synlig vs. Skjult", hypothesis: "En synlig fragt-tærskel øger gennemsnitlig ordreværdi", variantA: "Fragt nævnt først i checkout", variantB: "Banner: 'Fri fragt ved køb over 499 kr – du mangler X kr'", metric: "AOV / konverteringsrate", expectedImpact: "high", category: "conversion", pageTypes: ["produktside", "kurv"] },
  { title: "Nyhedsbrev popup: Rabat vs. Indhold", hypothesis: "10% rabat som incitament konverterer bedre end 'Tips & tricks'", variantA: "Popup: 'Tilmeld dig vores nyhedsbrev'", variantB: "Popup: 'Få 10% rabat – Tilmeld dig nu'", metric: "Email signup rate", expectedImpact: "high", category: "conversion", pageTypes: ["forside", "kollektionsside"] },
  { title: "Exit-intent popup", hypothesis: "Et tilbud når brugeren er ved at forlade øger recovery", variantA: "Ingen exit-intent", variantB: "Exit popup med specialtilbud / rabatkode", metric: "Exit rate / konverteringsrate", expectedImpact: "medium", category: "conversion", pageTypes: ["produktside", "landingsside"] },
  { title: "Cross-sell: 'Andre køber også'", hypothesis: "Produktanbefalinger øger gennemsnitlig ordreværdi", variantA: "Ingen cross-sell", variantB: "'Kunder der købte dette, købte også...' sektion", metric: "AOV / items per ordre", expectedImpact: "medium", category: "conversion", pageTypes: ["produktside", "kurv"] },
  { title: "Betalingsmetoder: Synlige vs. Skjulte", hypothesis: "Synlige betalingsikoner (MobilePay, Visa, etc.) øger tillid", variantA: "Betalingsmetoder nævnt i footer", variantB: "Betalingsikoner synlige tæt på CTA / i header", metric: "Konverteringsrate", expectedImpact: "medium", category: "conversion", pageTypes: ["produktside", "kurv"] },

  // ── Friktion ──
  { title: "Formular: Antal felter", hypothesis: "Færre formularfelter (3-4 vs. 6+) øger completion rate", variantA: "Nuværende antal felter", variantB: "Reduceret til kun nødvendige felter (3-4)", metric: "Form completion rate", expectedImpact: "high", category: "friction", pageTypes: ["landingsside", "checkout"] },
  { title: "Checkout: Gæste-checkout vs. Påkrævet login", hypothesis: "Gæste-checkout reducerer abandoned carts markant", variantA: "Login påkrævet før checkout", variantB: "Gæste-checkout option fremhævet", metric: "Checkout completion rate", expectedImpact: "high", category: "friction", pageTypes: ["checkout"] },
  { title: "Checkout: Single page vs. Multi-step", hypothesis: "Single page checkout med synlig progress reducerer tab", variantA: "Multi-step checkout", variantB: "Single page med accordion-sektioner", metric: "Checkout completion rate", expectedImpact: "medium", category: "friction", pageTypes: ["checkout"] },
  { title: "Formular: Inline validation vs. Submit validation", hypothesis: "Realtids-validering af felter reducerer fejl og frustration", variantA: "Fejlbeskeder efter submit", variantB: "Inline validering i realtid (grøn checkmark/rød fejl)", metric: "Form completion rate / tid til completion", expectedImpact: "medium", category: "friction", pageTypes: ["checkout", "landingsside"] },
  { title: "Checkout: Progress-indikator", hypothesis: "At vise trin i checkout-processen reducerer anxiety", variantA: "Uden progress bar", variantB: "Trin 1-2-3 progress bar i toppen", metric: "Checkout completion rate", expectedImpact: "medium", category: "friction", pageTypes: ["checkout"] },
  { title: "FAQ: Folded vs. Expanded", hypothesis: "En FAQ-sektion synlig på produkt/landing page adresserer tvivl", variantA: "Ingen FAQ synlig", variantB: "FAQ-sektion med de 5 mest stillede spørgsmål", metric: "Konverteringsrate / support-henvendelser", expectedImpact: "medium", category: "friction", pageTypes: ["produktside", "landingsside"] },
  { title: "Distraktion: Fjern sidebar/ads", hypothesis: "Renere layout uden distraktioner øger fokus på konvertering", variantA: "Nuværende layout med sideelementer", variantB: "Cleaner layout med fokus på primær CTA", metric: "Konverteringsrate", expectedImpact: "medium", category: "friction", pageTypes: ["landingsside", "produktside"] },
  { title: "Thank you-page optimering", hypothesis: "En optimeret tak-side med next-step CTA øger customer lifetime value", variantA: "Standard 'Tak for dit køb'", variantB: "Tak + relaterede produkter + 'Fortæl en ven, få 10% rabat'", metric: "Repeat purchase / referral rate", expectedImpact: "medium", category: "friction", pageTypes: ["checkout"] },

  // ── Mobil-specifikke ──
  { title: "Mobil: Sticky add-to-cart", hypothesis: "Sticky CTA på mobil holder købsmuligheden altid synlig", variantA: "CTA scroller med", variantB: "Sticky CTA-bar i bunden med pris + 'Køb nu'", metric: "Mobil konverteringsrate", expectedImpact: "high", category: "mobile", pageTypes: ["produktside"] },
  { title: "Mobil: Hamburger vs. Bottom nav", hypothesis: "Bottom navigation øger mobil engagement vs. hamburger menu", variantA: "Hamburger menu (top)", variantB: "Bottom tab navigation (Home, Søg, Kurv, Konto)", metric: "Navigation usage / sider per session", expectedImpact: "medium", category: "mobile", pageTypes: ["forside", "kollektionsside"] },
  { title: "Mobil: Tap targets størrelse", hypothesis: "Større tap targets (min. 44px) reducerer fejlklik og frustration", variantA: "Nuværende knap-størrelser", variantB: "Alle interaktive elementer min. 44x44px", metric: "Fejlklik / engagement", expectedImpact: "medium", category: "mobile", pageTypes: ["forside", "produktside", "kollektionsside"] },

  // ── Kollektionsside specifik ──
  { title: "Produktgrid: 3 vs. 4 kolonner", hypothesis: "3 kolonner med større billeder øger produktengagement", variantA: "4-kolonne grid", variantB: "3-kolonne grid med større billeder", metric: "Produkt-klik / konverteringsrate", expectedImpact: "medium", category: "design", pageTypes: ["kollektionsside"] },
  { title: "Quick-add-to-cart på produktkort", hypothesis: "Mulighed for at tilføje til kurv uden at åbne PDP sparer tid", variantA: "Kun 'Se produkt' link", variantB: "'Quick add' knap direkte på produktkortet", metric: "Add-to-cart rate / konverteringsrate", expectedImpact: "high", category: "conversion", pageTypes: ["kollektionsside"] },
  { title: "Filtrering: Sidebar vs. Top-bar", hypothesis: "Top-bar filtrering er mere synlig og bruges oftere", variantA: "Sidebar filtrering (skjult på mobil)", variantB: "Top-bar filtrering med chips", metric: "Filter usage / konverteringsrate", expectedImpact: "medium", category: "navigation", pageTypes: ["kollektionsside"] },
];

function generateABTestIdeas(ctx: AnalysisContext, categories: Category[]): ABTestIdea[] {
  const { pageType } = ctx;
  const errorCategories = new Set(
    categories.filter((c) => c.score < 60).map((c) => c.name)
  );
  const warningFindings = categories.flatMap((c) => c.findings).filter((f) => f.type !== "success");

  const relevant = AB_TEST_POOL
    .filter((idea) => idea.pageTypes.includes(pageType))
    .map((idea, i) => {
      let priority = 0;
      if (idea.expectedImpact === "high") priority += 3;
      if (idea.expectedImpact === "medium") priority += 1;
      const catName = ANALYSIS_CATEGORIES.find((c) => c.key === idea.category)?.name;
      if (catName && errorCategories.has(catName)) priority += 5;
      const relatedWarning = warningFindings.some((w) =>
        w.title.toLowerCase().includes(idea.title.toLowerCase().slice(0, 10)) ||
        idea.category === "cta" && w.law?.includes("Synlighed") ||
        idea.category === "social-proof" && w.law?.includes("Tillid") ||
        idea.category === "friction" && w.law?.includes("Friktion")
      );
      if (relatedWarning) priority += 3;
      return { ...idea, id: i + 1, _priority: priority };
    })
    .sort((a, b) => b._priority - a._priority)
    .map(({ _priority, ...idea }) => idea);

  return relevant.slice(0, 15);
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

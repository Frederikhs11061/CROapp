import type { AnalysisResult, Finding, Category, QuickWin } from "./cro-knowledge";
import type { ScrapedData } from "./scraper";

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

const ACTION_WORDS = [
  "køb", "bestil", "tilføj", "start", "prøv", "hent", "få", "book",
  "download", "tilmeld", "opret", "se", "shop", "buy", "add", "get",
  "try", "order", "subscribe", "sign up", "call", "click", "learn",
];

const URGENCY_WORDS = [
  "nu", "i dag", "begrænset", "kun", "sidste", "snart", "udløber",
  "skyndig", "hurtig", "limited", "today", "now", "only", "last",
  "ending", "expires", "few left", "almost gone", "sold out",
];

const TRUST_WORDS = [
  "garanti", "returret", "gratis fragt", "fri fragt", "sikker",
  "pengene tilbage", "ombytning", "forsikring", "tryg", "ssl",
  "krypteret", "guarantee", "free shipping", "money back", "secure",
  "encrypted", "certified", "verified",
];

const BENEFIT_WORDS = [
  "spar", "gratis", "hurtig", "nem", "billig", "bedste", "eksklusiv",
  "populær", "anbefalet", "favorit", "save", "free", "fast", "easy",
  "best", "exclusive", "popular", "recommended", "proven", "guaranteed",
];

function textContainsAny(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w));
}

function detectPageType(data: ScrapedData): string {
  const text = data.textContent.toLowerCase();
  const url = data.url.toLowerCase();
  const hasAddToCart = data.ctas.some((c) =>
    /tilføj|add to (cart|bag)|køb|buy|læg i kurv/i.test(c.text)
  );

  if (/checkout|betal|payment|ordre/i.test(url + text)) return "checkout";
  if (/cart|kurv|indkøb/i.test(url + text) && !hasAddToCart) return "kurv";
  if (/collections?|kategori|kollektion/i.test(url)) return "kollektionsside";
  if (hasAddToCart || /product|produkt/i.test(url)) return "produktside";
  if (url.replace(/https?:\/\/[^/]+\/?$/, "") === "" || /^\/?$/.test(new URL(data.url).pathname))
    return "forside";
  return "landingsside";
}

// ─── Category analyzers ─────────────────────────────────────────

function analyzeAboveTheFold(data: ScrapedData): Category {
  const findings: Finding[] = [];
  const h1s = data.headings.filter((h) => h.tag === "h1");

  if (h1s.length === 0) {
    findings.push(f("error", "Manglende H1-overskrift", "Siden har ingen H1-overskrift, hvilket er kritisk for både SEO og konvertering. Besøgende ved ikke med det samme hvad siden handler om.", "Tilføj en klar, benefit-orienteret H1-overskrift above the fold der kommunikerer dit værditilbud.", "high", "Klarhedslov"));
  } else if (h1s.length > 1) {
    findings.push(f("warning", "Flere H1-overskrifter", `Siden har ${h1s.length} H1-overskrifter. Det skaber forvirring om hierarkiet.`, "Behold kun én H1 der kommunikerer det primære værditilbud. Konvertér resten til H2.", "medium", "Klarhedslov"));
  } else {
    const h1Text = h1s[0].text;
    const hasBenefitWords = textContainsAny(h1Text, BENEFIT_WORDS).length > 0;
    if (hasBenefitWords) {
      findings.push(f("success", "Benefit-orienteret H1", `H1 "${h1Text.slice(0, 60)}..." indeholder benefit-ord der appellerer til besøgende.`, "", "high", "Maksimeringsloven"));
    } else {
      findings.push(f("warning", "H1 mangler benefit-fokus", `H1 "${h1Text.slice(0, 60)}..." beskriver ikke tydeligt en fordel for besøgende.`, "Omskriv din H1 så den fokuserer på den primære fordel for kunden, ikke bare hvad du laver.", "high", "Maksimeringsloven"));
    }
  }

  if (data.structuralInfo.hasHero) {
    findings.push(f("success", "Hero-sektion fundet", "Siden har en hero/banner-sektion above the fold der fanger opmærksomheden.", "", "medium", "Synlighedslov"));
  } else {
    findings.push(f("warning", "Ingen hero-sektion detekteret", "Der blev ikke fundet en tydelig hero-sektion. Første indtryk er kritisk.", "Tilføj en prominent hero-sektion med headline, underoverskrift, CTA og visuelt element.", "high", "Synlighedslov"));
  }

  if (data.structuralInfo.hasVideo) {
    findings.push(f("success", "Video-indhold fundet", "Siden indeholder video, som øger engagement og kan forklare komplekse tilbud hurtigt.", "", "medium", "Alignment-lov"));
  }

  const metaDesc = data.metaDescription;
  if (!metaDesc) {
    findings.push(f("error", "Manglende meta description", "Siden har ingen meta description, hvilket påvirker CTR fra søgeresultater negativt.", "Skriv en unik meta description på 140-155 tegn der inkluderer et klart værditilbud og en CTA.", "high", "Synlighedslov"));
  } else if (metaDesc.length < 100) {
    findings.push(f("warning", "For kort meta description", `Meta description er kun ${metaDesc.length} tegn. Den bør være 140-155 tegn.`, "Udvid din meta description til 140-155 tegn med tydelige benefits og en call-to-action.", "medium", "Synlighedslov"));
  } else if (metaDesc.length > 160) {
    findings.push(f("warning", "For lang meta description", `Meta description er ${metaDesc.length} tegn og vil blive afkortet i søgeresultater.`, "Forkort din meta description til max 155 tegn.", "low", "Synlighedslov"));
  } else {
    findings.push(f("success", "God meta description", `Meta description har en god længde på ${metaDesc.length} tegn.`, "", "medium", "Synlighedslov"));
  }

  const score = calcScore(findings);
  return { name: "Above the Fold", score, icon: "👁️", findings };
}

function analyzeCTA(data: ScrapedData): Category {
  const findings: Finding[] = [];
  const ctaCount = data.ctas.length;

  if (ctaCount === 0) {
    findings.push(f("error", "Ingen CTA-knapper fundet", "Siden har ingen synlige CTA-knapper (buttons). Uden en klar call-to-action vet besøgende ikke hvad de skal gøre.", "Tilføj mindst én tydelig, høj-kontrast CTA-knap above the fold med handlingsorienteret tekst.", "high", "Synlighedslov"));
  } else if (ctaCount === 1) {
    findings.push(f("warning", "Kun én CTA-knap", "Siden har kun én CTA-knap. Gentagelsesloven siger at CTA bør gentages flere gange.", "Gentag din primære CTA flere steder på siden – mindst above the fold og igen efter nøgleindhold.", "medium", "Gentagelseslov"));
  } else if (ctaCount >= 2 && ctaCount <= 5) {
    findings.push(f("success", "Godt antal CTA-knapper", `Siden har ${ctaCount} CTA-knapper spredt ud, hvilket giver besøgende flere muligheder for at konvertere.`, "", "medium", "Gentagelseslov"));
  } else {
    findings.push(f("warning", "Mange CTA-knapper", `Siden har ${ctaCount} buttons/CTAs. For mange kan skabe forvirring om hvad der er vigtigst.`, "Reducer antallet af sekundære CTAs og gør den primære CTA tydeligt mest prominent.", "medium", "Friktionslov"));
  }

  const ctaTexts = data.ctas.map((c) => c.text.toLowerCase()).join(" ");
  const foundActionWords = textContainsAny(ctaTexts, ACTION_WORDS);
  if (foundActionWords.length > 0) {
    findings.push(f("success", "Handlingsorienterede CTA-tekster", `CTA-knapperne bruger action-ord som "${foundActionWords.slice(0, 3).join('", "')}", hvilket motiverer til klik.`, "", "medium", "Maksimeringsloven"));
  } else if (ctaCount > 0) {
    findings.push(f("warning", "CTA-tekster mangler action-ord", "CTA-knapperne bruger ikke stærke handlingsord som 'Køb nu', 'Få adgang', 'Start gratis' osv.", "Omskriv CTA-tekster til at bruge klare handlingsord der fortæller besøgende præcis hvad der sker.", "high", "Maksimeringsloven"));
  }

  const vagueCtas = data.ctas.filter((c) =>
    /^(læs mere|klik her|mere|submit|send|click here|read more|more|learn more)$/i.test(c.text.trim())
  );
  if (vagueCtas.length > 0) {
    findings.push(f("warning", "Vage CTA-tekster", `${vagueCtas.length} CTA-knap(per) bruger vag tekst som "${vagueCtas[0].text}". Det siger ikke hvad besøgende får.`, "Erstat vage CTA-tekster med specifikke handlinger: 'Få gratis prøveperiode', 'Se vores produkter', 'Book en demo'.", "medium", "Klarhedslov"));
  }

  const score = calcScore(findings);
  return { name: "Call to Action", score, icon: "🎯", findings };
}

function analyzeSocialProof(data: ScrapedData): Category {
  const findings: Finding[] = [];
  const text = data.textContent.toLowerCase();

  if (data.socialProof.length === 0) {
    findings.push(f("error", "Intet social proof fundet", "Siden indeholder ingen synlige social proof-elementer som anmeldelser, testimonials, ratings eller kundeudtalelser.", "Tilføj social proof: Trustpilot-widget, kundeudtalelser med navne/billeder, antal tilfredse kunder, eller presselogoer.", "high", "Tillidslov"));
  } else {
    findings.push(f("success", "Social proof er til stede", `Fandt social proof-signaler: ${data.socialProof.join(", ")}. Det opbygger tillid hos besøgende.`, "", "high", "Tillidslov"));
  }

  if (data.structuralInfo.hasTestimonials) {
    findings.push(f("success", "Testimonials-sektion fundet", "Siden har en dedikeret testimonials/anmeldelsessektion, som er stærkt tillidsopbyggende.", "", "high", "Tillidslov"));
  } else {
    findings.push(f("warning", "Mangler testimonials-sektion", "Ingen dedikeret testimonials-sektion fundet. Kundecitater er et af de stærkeste CRO-virkemidler.", "Tilføj en testimonials-sektion med ægte kundecitater, navne og helst billeder.", "high", "Tillidslov"));
  }

  if (data.structuralInfo.hasTrustBadges) {
    findings.push(f("success", "Trust badges fundet", "Siden viser trust badges / sikkerhedssymboler der opbygger troværdighed.", "", "medium", "Tillidslov"));
  } else {
    findings.push(f("error", "Mangler trust badges", "Ingen trust badges fundet (fx e-mærket, sikker betaling, Trustpilot-badge, garanti-segl).", "Tilføj trust badges tæt på CTA-knapper og i checkout – fx 'Sikker betaling', 'Pengene-tilbage-garanti', Trustpilot-score.", "high", "Tillidslov"));
  }

  const trustWordsFound = textContainsAny(text, TRUST_WORDS);
  if (trustWordsFound.length > 0) {
    findings.push(f("success", "Tillids-sprog i teksten", `Teksten indeholder tillidsopbyggende ord: "${trustWordsFound.slice(0, 4).join('", "')}".`, "", "medium", "Tillidslov"));
  } else {
    findings.push(f("warning", "Mangler tillids-sprog", "Teksten nævner ikke garanti, returret, fri fragt eller lignende tillidsopbyggende elementer.", "Tilføj synlige garantier, returpolitik og leveringsinfo i din tekst – gerne tæt på CTA.", "medium", "Tab-lov"));
  }

  if (/trustpilot/i.test(text)) {
    findings.push(f("success", "Trustpilot-integration", "Trustpilot er nævnt på siden, hvilket er stærkt social proof for danske forbrugere.", "", "high", "Tillidslov"));
  }

  const score = calcScore(findings);
  return { name: "Social Proof & Tillid", score, icon: "⭐", findings };
}

function analyzeContent(data: ScrapedData): Category {
  const findings: Finding[] = [];
  const headingCount = data.headings.length;

  if (headingCount === 0) {
    findings.push(f("error", "Ingen overskrifter", "Siden har ingen overskrifter (H1-H6). Det er kritisk for både SEO og scannability.", "Tilføj en klar overskriftsstruktur: H1 for hovedbudskab, H2 for sektioner, H3 for undersektioner.", "high", "Klarhedslov"));
  } else {
    const h1Count = data.headings.filter((h) => h.tag === "h1").length;
    const h2Count = data.headings.filter((h) => h.tag === "h2").length;
    const h3Count = data.headings.filter((h) => h.tag === "h3").length;

    if (h2Count >= 2) {
      findings.push(f("success", "God overskriftsstruktur", `Siden har ${h1Count} H1, ${h2Count} H2 og ${h3Count} H3 – det giver godt hierarki og scannability.`, "", "medium", "Klarhedslov"));
    } else {
      findings.push(f("warning", "Svag overskriftsstruktur", `Kun ${h2Count} H2-overskrifter. Flere H2-sektioner gør indholdet nemmere at scanne.`, "Opdel indholdet i klare sektioner med H2-overskrifter for hvert emne/benefit.", "medium", "Klarhedslov"));
    }
  }

  if (!data.title || data.title.length === 0) {
    findings.push(f("error", "Manglende title tag", "Siden har ingen title tag, hvilket er kritisk for SEO.", "Tilføj en unik title tag på 55-60 tegn med dit primære keyword og værditilbud.", "high", "Synlighedslov"));
  } else if (data.title.length < 30) {
    findings.push(f("warning", "For kort title tag", `Title tag er kun ${data.title.length} tegn: "${data.title}". Den bør være 55-60 tegn.`, "Udvid din title tag til 55-60 tegn med relevante keywords og benefits.", "medium", "Synlighedslov"));
  } else if (data.title.length > 65) {
    findings.push(f("warning", "For lang title tag", `Title tag er ${data.title.length} tegn og vil blive afkortet i Google.`, "Forkort din title tag til max 60 tegn.", "low", "Synlighedslov"));
  } else {
    findings.push(f("success", "God title tag-længde", `Title tag har en god længde på ${data.title.length} tegn: "${data.title}".`, "", "medium", "Synlighedslov"));
  }

  const imagesWithoutAlt = data.images.filter((i) => !i.hasAlt);
  if (imagesWithoutAlt.length > 0) {
    findings.push(f("warning", "Billeder mangler alt-tekst", `${imagesWithoutAlt.length} af ${data.images.length} billeder mangler alt-tekst. Dårligt for SEO og tilgængelighed.`, "Tilføj beskrivende alt-tekst på alle billeder der forklarer hvad billedet viser.", "medium", "Synlighedslov"));
  } else if (data.images.length > 0) {
    findings.push(f("success", "Alle billeder har alt-tekst", `Alle ${data.images.length} billeder har alt-tekst – godt for SEO og tilgængelighed.`, "", "medium", "Synlighedslov"));
  }

  const textLength = data.textContent.length;
  if (textLength < 300) {
    findings.push(f("warning", "Meget lidt tekstindhold", `Siden har kun ca. ${textLength} tegn tekst. Det er meget lidt for SEO og konvertering.`, "Tilføj mere indhold: uddyb dit værditilbud, beskriv benefits, tilføj FAQ-sektion.", "medium", "Klarhedslov"));
  } else if (textLength > 500) {
    findings.push(f("success", "Tilstrækkeligt tekstindhold", "Siden har en god mængde tekstindhold til at kommunikere værdi og ranke i søgemaskiner.", "", "low", "Klarhedslov"));
  }

  const text = data.textContent.toLowerCase();
  const howItWorks = /sådan virker|how it works|hvordan fungerer|trin for trin|step by step/i.test(text);
  if (howItWorks) {
    findings.push(f("success", "'Sådan virker det'-sektion", "Siden forklarer tydeligt processen/fremgangsmåden, hvilket reducerer usikkerhed.", "", "medium", "Klarhedslov"));
  }

  const score = calcScore(findings);
  return { name: "Indhold & Copywriting", score, icon: "✍️", findings };
}

function analyzeNavigation(data: ScrapedData): Category {
  const findings: Finding[] = [];

  if (data.structuralInfo.hasNav) {
    findings.push(f("success", "Navigation fundet", "Siden har et nav-element, hvilket giver brugere en klar måde at navigere på.", "", "medium", "Klarhedslov"));
  } else {
    findings.push(f("error", "Ingen navigation fundet", "Siden har intet nav-element. Besøgende kan ikke finde rundt.", "Tilføj en klar top-navigation med de vigtigste sider (max 7 menupunkter).", "high", "Klarhedslov"));
  }

  if (data.structuralInfo.hasFooter) {
    findings.push(f("success", "Footer fundet", "Siden har en footer med yderligere navigation og information.", "", "low", "Klarhedslov"));
  } else {
    findings.push(f("warning", "Ingen footer fundet", "Siden mangler en footer. Footeren er vigtig for tillid (kontaktinfo, politikker) og SEO (interne links).", "Tilføj en footer med kontaktinfo, links til vigtige sider, og evt. trust badges.", "medium", "Tillidslov"));
  }

  const internalLinks = data.links.filter((l) => !l.isExternal).length;
  const externalLinks = data.links.filter((l) => l.isExternal).length;

  if (internalLinks < 3) {
    findings.push(f("warning", "Få interne links", `Kun ${internalLinks} interne links. Det begrænser navigation og SEO-linkjuice.`, "Tilføj flere interne links til relevante sider for at forbedre navigation og SEO.", "medium", "Synlighedslov"));
  } else {
    findings.push(f("success", "God intern linking", `${internalLinks} interne links giver god navigation og SEO-struktur.`, "", "low", "Synlighedslov"));
  }

  if (externalLinks > 10) {
    findings.push(f("warning", "Mange eksterne links", `${externalLinks} eksterne links kan lede besøgende væk fra siden og fra konverteringen.`, "Reducer antallet af eksterne links, eller sæt dem til at åbne i nye vinduer.", "medium", "Friktionslov"));
  }

  const sectionCount = data.structuralInfo.sectionCount;
  if (sectionCount >= 3) {
    findings.push(f("success", "God sektionsopdeling", `Siden har ${sectionCount} sektioner, som skaber visuel adskillelse og gør indholdet overskueligt.`, "", "medium", "Klarhedslov"));
  } else if (sectionCount === 0) {
    findings.push(f("warning", "Ingen sektionsopdeling", "Siden bruger ikke semantiske section-elementer til at opdele indholdet.", "Opdel indholdet i klare sektioner med baggrundsskift for visuel adskillelse.", "medium", "Klarhedslov"));
  }

  if (data.structuralInfo.hasFAQ) {
    findings.push(f("success", "FAQ-sektion fundet", "FAQ-sektionen adresserer tvivl og reducerer friktion – godt for konvertering og SEO.", "", "medium", "Tab-lov"));
  } else {
    findings.push(f("warning", "Mangler FAQ-sektion", "Ingen FAQ fundet. En FAQ adresserer indvendinger, bygger tillid og forbedrer SEO.", "Tilføj en FAQ med de 4-8 mest stillede spørgsmål. Gerne med schema markup.", "medium", "Tab-lov"));
  }

  const score = calcScore(findings);
  return { name: "Navigation & Struktur", score, icon: "🧭", findings };
}

function analyzeDesignUX(data: ScrapedData): Category {
  const findings: Finding[] = [];

  if (data.images.length === 0) {
    findings.push(f("error", "Ingen billeder", "Siden har ingen billeder. Visuelt indhold er kritisk for engagement og konvertering.", "Tilføj relevante billeder: produktfotos, hero-billeder, team-fotos eller illustrationer.", "high", "Alignment-lov"));
  } else if (data.images.length >= 3) {
    findings.push(f("success", "Godt visuelt indhold", `Siden har ${data.images.length} billeder, som beriger det visuelle udtryk.`, "", "medium", "Alignment-lov"));
  } else {
    findings.push(f("warning", "Få billeder", `Kun ${data.images.length} billede(r) på siden. Flere visuelle elementer øger engagement.`, "Tilføj flere relevante billeder: produktbilleder, ikoner, illustrationer.", "medium", "Alignment-lov"));
  }

  if (data.structuralInfo.hasVideo) {
    findings.push(f("success", "Video-indhold", "Siden indeholder video, hvilket øger engagement og tid på siden markant.", "", "medium", "Alignment-lov"));
  } else {
    findings.push(f("warning", "Ingen video", "Ingen video fundet. Video er et af de mest effektive midler til at forklare og konvertere.", "Overvej at tilføje en forklaringsvideo eller produktvideo above the fold.", "medium", "Alignment-lov"));
  }

  if (data.structuralInfo.sectionCount >= 3) {
    findings.push(f("success", "Visuelt opdelt layout", "Indholdet er opdelt i sektioner, hvilket giver et overskueligt og professionelt udtryk.", "", "medium", "Klarhedslov"));
  }

  const ogImage = data.metaTags["og:image"];
  if (ogImage) {
    findings.push(f("success", "Open Graph-billede", "Siden har et OG-billede til sociale medier – vigtigt for delinger.", "", "low", "Synlighedslov"));
  } else {
    findings.push(f("warning", "Mangler Open Graph-billede", "Intet og:image sat. Når siden deles på sociale medier vises intet preview-billede.", "Tilføj et og:image meta tag med et attraktivt billede (1200x630px).", "medium", "Synlighedslov"));
  }

  const score = calcScore(findings);
  return { name: "Visuelt Design & UX", score, icon: "🎨", findings };
}

function analyzeMobilePerformance(data: ScrapedData): Category {
  const findings: Finding[] = [];
  const { loadTime, domContentLoaded, resourceCount } = data.performance;

  if (loadTime < 2000) {
    findings.push(f("success", "Hurtig load speed", `Siden loadede på ${(loadTime / 1000).toFixed(1)}s – under 2 sekunder er fremragende.`, "", "high", "Friktionslov"));
  } else if (loadTime < 4000) {
    findings.push(f("warning", "Acceptabel load speed", `Siden loadede på ${(loadTime / 1000).toFixed(1)}s. Under 2 sekunder er ideelt.`, "Optimér billeder (WebP/AVIF), aktiver caching, reducer JavaScript og antal HTTP-requests.", "high", "Friktionslov"));
  } else {
    findings.push(f("error", "Langsom side", `Siden loadede på ${(loadTime / 1000).toFixed(1)}s – det er for langsomt. Hver sekund over 3s koster konverteringer.`, "Prioritér: komprimer billeder, lazy-load under fold, fjern unødvendige scripts, brug CDN.", "high", "Friktionslov"));
  }

  if (domContentLoaded > 0 && domContentLoaded < 1500) {
    findings.push(f("success", "Hurtig DOM ready", `DOM var klar på ${domContentLoaded}ms – godt for interaktivitet.`, "", "medium", "Friktionslov"));
  } else if (domContentLoaded > 3000) {
    findings.push(f("warning", "Langsom DOM ready", `DOM Content Loaded tog ${domContentLoaded}ms. Det forsinker interaktivitet.`, "Reducer render-blocking CSS/JS og overvej server-side rendering.", "medium", "Friktionslov"));
  }

  if (resourceCount > 100) {
    findings.push(f("warning", "Mange HTTP-requests", `Siden henter ${resourceCount} ressourcer. Det er mange og påvirker loadtiden.`, "Reducer antallet af requests: kombiner CSS/JS, lazy-load billeder, fjern unødvendige scripts.", "medium", "Friktionslov"));
  } else if (resourceCount > 0) {
    findings.push(f("success", "Rimeligt antal requests", `Siden henter ${resourceCount} ressourcer – acceptabelt antal.`, "", "low", "Friktionslov"));
  }

  const viewport = data.metaTags["viewport"];
  if (viewport) {
    findings.push(f("success", "Viewport meta tag", "Siden har et viewport meta tag, hvilket er nødvendigt for mobiloptimering.", "", "high", "Friktionslov"));
  } else {
    findings.push(f("error", "Mangler viewport meta tag", "Ingen viewport meta tag fundet. Siden er sandsynligvis ikke mobiloptimeret.", "Tilføj <meta name='viewport' content='width=device-width, initial-scale=1'> i head.", "high", "Friktionslov"));
  }

  const score = calcScore(findings);
  return { name: "Mobil & Performance", score, icon: "📱", findings };
}

function analyzeConversionElements(data: ScrapedData): Category {
  const findings: Finding[] = [];
  const text = data.textContent.toLowerCase();

  if (data.structuralInfo.hasPricing) {
    findings.push(f("success", "Prisvisning fundet", "Siden viser priser, hvilket er vigtigt for transparens og konvertering.", "", "high", "Klarhedslov"));
  } else {
    findings.push(f("warning", "Ingen prisvisning detekteret", "Ingen synlig prisvisning fundet. Pris-transparens reducerer friktion markant.", "Vis priser tydeligt. Overvej prisforankring (førpris/nu-pris) for at fremhæve besparelser.", "high", "Klarhedslov"));
  }

  const urgencyFound = textContainsAny(text, URGENCY_WORDS);
  if (urgencyFound.length > 0) {
    findings.push(f("success", "Urgency-elementer", `Siden bruger urgency-ord som "${urgencyFound.slice(0, 3).join('", "')}" der motiverer til hurtig handling.`, "", "medium", "Tab-lov"));
  } else {
    findings.push(f("warning", "Mangler urgency", "Ingen urgency-elementer fundet (tidsbegrænset tilbud, begrænset antal, osv.).", "Tilføj urgency: 'Kun 3 tilbage', 'Tilbud udløber i dag', 'Begrænset antal' – men hold det ærligt.", "medium", "Tab-lov"));
  }

  if (data.structuralInfo.hasNewsletter) {
    findings.push(f("success", "Nyhedsbrev-signup", "Siden har en nyhedsbrev-tilmelding, som opfanger besøgende der ikke konverterer med det samme.", "", "medium", "Gentagelseslov"));
  } else {
    findings.push(f("warning", "Mangler nyhedsbrev-signup", "Ingen email-signup fundet. Du mister muligheden for at følge op på besøgende.", "Tilføj en nyhedsbrev-signup med et incitament (rabat, guide, gratis ressource).", "medium", "Gentagelseslov"));
  }

  if (data.forms.length > 0) {
    findings.push(f("success", "Formular fundet", `Siden har ${data.forms.length} formular(er) til at opfange leads/konverteringer.`, "", "medium", "Synlighedslov"));
  }

  const guaranteeFound = /garanti|guarantee|money.?back|pengene.?tilbage|returret|return/i.test(text);
  if (guaranteeFound) {
    findings.push(f("success", "Garanti nævnt", "Siden nævner garanti eller returret, hvilket reducerer købs-risikoen markant.", "", "high", "Tab-lov"));
  } else {
    findings.push(f("warning", "Ingen garanti synlig", "Ingen garanti, returret eller money-back er nævnt. Det øger den oplevede risiko ved køb.", "Tilføj en synlig garanti tæt på CTA: '30 dages returret', 'Fuld pengene-tilbage-garanti'.", "high", "Tab-lov"));
  }

  const freeShipping = /gratis fragt|fri fragt|free shipping|fri levering|gratis levering/i.test(text);
  if (freeShipping) {
    findings.push(f("success", "Gratis fragt nævnt", "Gratis fragt er kommunikeret – et af de mest effektive konverteringsmidler i e-commerce.", "", "high", "Maksimeringsloven"));
  }

  const score = calcScore(findings);
  return { name: "Konverteringselementer", score, icon: "💰", findings };
}

function analyzeFriction(data: ScrapedData): Category {
  const findings: Finding[] = [];

  const bigForms = data.forms.filter((f) => f.fields > 5);
  if (bigForms.length > 0) {
    findings.push(f("error", "Formularer med mange felter", `${bigForms.length} formular(er) har mere end 5 felter. Hvert ekstra felt reducerer konverteringsraten.`, "Reducer formularfelter til det absolut nødvendige. Overvej progressiv afsløring (vis flere felter i trin).", "high", "Friktionslov"));
  } else if (data.forms.length > 0) {
    findings.push(f("success", "Korte formularer", "Formularerne har et lavt antal felter, hvilket reducerer friktion.", "", "medium", "Friktionslov"));
  }

  const formsWithoutLabels = data.forms.filter((f) => !f.hasLabels);
  if (formsWithoutLabels.length > 0) {
    findings.push(f("warning", "Formularer mangler labels", `${formsWithoutLabels.length} formular(er) mangler labels på felter. Det skaber forvirring.`, "Tilføj synlige labels på alle formularfelter (ikke kun placeholder-tekst).", "medium", "Klarhedslov"));
  }

  const externalLinks = data.links.filter((l) => l.isExternal).length;
  if (externalLinks > 15) {
    findings.push(f("warning", "For mange udgående links", `${externalLinks} eksterne links kan lede besøgende væk inden de konverterer.`, "Fjern unødvendige eksterne links fra nøglesider, eller åbn dem i nye vinduer.", "medium", "Friktionslov"));
  }

  const text = data.textContent.toLowerCase();
  const privacyMentioned = /privatliv|privacy|gdpr|cookie/i.test(text);
  if (privacyMentioned) {
    findings.push(f("success", "Privatlivspolitik synlig", "Siden nævner privatliv/GDPR, hvilket opbygger tillid og reducerer usikkerhed.", "", "medium", "Tab-lov"));
  } else {
    findings.push(f("warning", "Privatlivspolitik ikke synlig", "Ingen synlig reference til privatlivspolitik. Det er lovpligtigt og tillidsopbyggende.", "Sørg for at privatlivspolitik er linket fra footer og nær formularer.", "medium", "Tab-lov"));
  }

  const contactInfo = /kontakt|contact|telefon|phone|email|e-mail|tlf|ring/i.test(text);
  if (contactInfo) {
    findings.push(f("success", "Kontaktinfo synlig", "Besøgende kan finde kontaktinformation, hvilket øger tillid markant.", "", "medium", "Tillidslov"));
  } else {
    findings.push(f("warning", "Ingen kontaktinfo synlig", "Ingen synlig kontaktinformation (telefon, email, adresse). Det kan virke utroværdigt.", "Tilføj kontaktinfo i header eller footer: telefonnummer, email, evt. fysisk adresse.", "medium", "Tillidslov"));
  }

  if (data.performance.loadTime > 4000) {
    findings.push(f("error", "Langsom loadtid er en barriere", `${(data.performance.loadTime / 1000).toFixed(1)}s loadtid er en direkte konverteringsbarriere. 53% forlader en side der tager over 3s at loade.`, "Prioritér performance-optimering: billedkomprimering, lazy loading, CDN, reducer scripts.", "high", "Friktionslov"));
  }

  const score = calcScore(findings);
  return { name: "Friktion & Barrierer", score, icon: "🚧", findings };
}

// ─── Score calculation ──────────────────────────────────────────

function calcScore(findings: Finding[]): number {
  if (findings.length === 0) return 50;

  const weights = { high: 3, medium: 2, low: 1 };
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const finding of findings) {
    const w = weights[finding.impact];
    totalWeight += w;
    if (finding.type === "success") earnedWeight += w;
    else if (finding.type === "warning") earnedWeight += w * 0.4;
  }

  return Math.round((earnedWeight / totalWeight) * 100);
}

// ─── Quick wins generator ───────────────────────────────────────

function generateQuickWins(categories: Category[]): QuickWin[] {
  const allFindings = categories.flatMap((c) => c.findings);

  const highImpactErrors = allFindings
    .filter((f) => f.type === "error" && f.impact === "high" && f.recommendation)
    .slice(0, 3)
    .map((f) => ({
      title: f.title,
      description: f.recommendation,
      estimatedImpact: "Høj – dokumenteret effekt på konverteringsraten",
    }));

  const highImpactWarnings = allFindings
    .filter((f) => f.type === "warning" && f.impact === "high" && f.recommendation)
    .slice(0, 4)
    .map((f) => ({
      title: f.title,
      description: f.recommendation,
      estimatedImpact: "Medium-høj – kan typisk implementeres hurtigt",
    }));

  return [...highImpactErrors, ...highImpactWarnings].slice(0, 6);
}

function generatePrioritizedActions(categories: Category[]): string[] {
  const allFindings = categories.flatMap((c) => c.findings);

  return allFindings
    .filter((f) => f.type !== "success" && f.recommendation)
    .sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const typeOrder = { error: 0, warning: 1, success: 2 };
      return (
        impactOrder[a.impact] - impactOrder[b.impact] ||
        typeOrder[a.type] - typeOrder[b.type]
      );
    })
    .slice(0, 5)
    .map((f) => f.recommendation);
}

function generateSummary(
  categories: Category[],
  overallScore: number,
  pageType: string
): string {
  const errorCount = categories.reduce(
    (a, c) => a + c.findings.filter((f) => f.type === "error").length, 0
  );
  const successCount = categories.reduce(
    (a, c) => a + c.findings.filter((f) => f.type === "success").length, 0
  );

  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];
  const strongest = [...categories].sort((a, b) => b.score - a.score)[0];

  let summary = `Din ${pageType} scorer ${overallScore}/100 i vores CRO-analyse. `;

  if (errorCount > 0) {
    summary += `Vi fandt ${errorCount} kritiske problemer der bør løses først. `;
  }

  summary += `Stærkeste område: ${strongest.name} (${strongest.score}/100). `;
  summary += `Størst forbedringspotentiale: ${weakest.name} (${weakest.score}/100).`;

  return summary;
}

// ─── Main entry point ───────────────────────────────────────────

export function analyzeWebsite(data: ScrapedData): AnalysisResult {
  const pageType = detectPageType(data);

  const categories: Category[] = [
    analyzeAboveTheFold(data),
    analyzeCTA(data),
    analyzeSocialProof(data),
    analyzeContent(data),
    analyzeNavigation(data),
    analyzeDesignUX(data),
    analyzeMobilePerformance(data),
    analyzeConversionElements(data),
    analyzeFriction(data),
  ];

  const overallScore = Math.round(
    categories.reduce((a, c) => a + c.score, 0) / categories.length
  );

  const quickWins = generateQuickWins(categories);
  const prioritizedActions = generatePrioritizedActions(categories);
  const summary = generateSummary(categories, overallScore, pageType);

  return {
    overallScore,
    pageType,
    summary,
    categories,
    quickWins,
    prioritizedActions,
  };
}

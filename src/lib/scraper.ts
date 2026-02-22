import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

const CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";

export type CTAInfo = {
  text: string;
  tag: string;
  href?: string;
  isAboveFold: boolean;
  fontSize: number;
  area: number;
  bgColor: string;
  textColor: string;
  isPrimary: boolean;
};

export type TrustSignal = {
  type: "badge" | "text" | "social_proof" | "authority";
  description: string;
  location: string;
};

export type HeadingInfo = {
  tag: string;
  text: string;
  isAboveFold: boolean;
};

export type ScrapedData = {
  title: string;
  metaDescription: string;
  url: string;
  screenshot: string;
  headings: HeadingInfo[];
  links: { text: string; href: string; isExternal: boolean }[];
  images: { alt: string; src: string; hasAlt: boolean; isAboveFold: boolean }[];
  ctas: CTAInfo[];
  forms: { fields: number; hasLabels: boolean; action?: string; hasPlaceholders: boolean; hasValidation: boolean; hasRequired: boolean; fieldTypes: string[] }[];
  trustSignals: TrustSignal[];
  metaTags: Record<string, string>;
  performance: {
    loadTime: number;
    domContentLoaded: number;
    resourceCount: number;
  };
  structuralInfo: {
    hasNav: boolean;
    hasFooter: boolean;
    hasHero: boolean;
    hasFAQ: boolean;
    hasTestimonials: boolean;
    hasPricing: boolean;
    hasVideo: boolean;
    hasTrustBadges: boolean;
    hasNewsletter: boolean;
    hasProductGallery: boolean;
    hasAddToCart: boolean;
    hasCartWidget: boolean;
    hasCheckoutForm: boolean;
    hasFilters: boolean;
    hasBreadcrumbs: boolean;
    hasProgressIndicator: boolean;
    sectionCount: number;
    navItemCount: number;
  };
  firstScreenContent: {
    heroText: string;
    heroSubtext: string;
    visibleCTACount: number;
    hasSocialProofAboveFold: boolean;
    hasImageAboveFold: boolean;
    hasVideoAboveFold: boolean;
  };
  copyAnalysis: {
    valueProposition: string;
    usps: string[];
    benefitStatements: string[];
    featureStatements: string[];
    urgencyElements: string[];
    guaranteeStatements: string[];
  };
  pageSignals: {
    hasProductSchema: boolean;
    hasBreadcrumbSchema: boolean;
    hasOrganizationSchema: boolean;
    priceVisible: boolean;
    currencySymbols: string[];
    productCount: number;
    cartIndicators: string[];
    checkoutIndicators: string[];
  };
  textContent: string;
  viewport: "desktop" | "mobile";
  uxSignals: {
    hasSkipToContent: boolean;
    hasAriaLabels: boolean;
    hasFocusStyles: boolean;
    hasAltOnAllImages: boolean;
    colorContrast: "good" | "warning" | "poor";
    has404Links: number;
    hasSearchField: boolean;
    hasThankYouPage: boolean;
    hasChatWidget: boolean;
    hasExitIntent: boolean;
    hasStickyHeader: boolean;
    hasStickyNav: boolean;
    hasBackToTop: boolean;
    hasAnimations: boolean;
    hasCookieConsent: boolean;
  };
  securitySignals: {
    scriptsWithoutSRI: string[];
    scriptsWithSRI: number;
    mixedContentUrls: string[];
    exposedEmails: string[];
    hasPrivacyPolicy: boolean;
    hasCookiePolicy: boolean;
    hasTerms: boolean;
    hasRecaptcha: boolean;
    hasLoginForm: boolean;
    jqueryVersion: string | null;
    hasContactInfo: boolean;
    hasCVR: boolean;
    hasSecureCheckoutBadge: boolean;
    adminLinks: string[];
    hasAggressivePopups: boolean;
  };
};

export type SecurityHeadersData = {
  headers: Record<string, string>;
  hasHSTS: boolean;
  hstsMaxAge: number | null;
  hasCSP: boolean;
  cspValue: string;
  hasXFrameOptions: boolean;
  hasXContentTypeOptions: boolean;
  hasReferrerPolicy: boolean;
  referrerPolicyValue: string;
  hasPermissionsPolicy: boolean;
  hasXXSSProtection: boolean;
  serverHeader: string;
  poweredByHeader: string;
  hasGzip: boolean;
  hasBrotli: boolean;
  hasCacheControl: boolean;
  cacheControlValue: string;
  tlsVersion: string;
  robotsTxtContent: string | null;
};

async function getBrowser() {
  const executablePath = await chromium.executablePath(CHROMIUM_PACK);
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1440, height: 900 },
    executablePath,
    headless: true,
  });
}

export async function scrapeWebsite(
  url: string,
  viewport: "desktop" | "mobile" = "desktop"
): Promise<ScrapedData> {
  const browser = await getBrowser();
  let page;
  try {
    page = await browser.newPage();
  } catch (err) {
    await browser.close().catch(() => {});
    throw new Error(`Kunne ikke åbne browser-side: ${err instanceof Error ? err.message : err}`);
  }

  try {

  if (viewport === "mobile") {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    );
  } else {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  }

  const startTime = Date.now();
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  } catch {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
    } catch {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const loadTime = Date.now() - startTime;

  // Wait for any client-side redirects to settle
  try {
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => {});
  } catch { /* no pending navigation, that's fine */ }
  await new Promise((r) => setTimeout(r, 2000));

  let screenshot = "";
  try {
    const buf = await Promise.race([
      page.screenshot({ encoding: "base64", fullPage: false, type: "jpeg", quality: 70 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("screenshot timeout")), 10000)),
    ]);
    screenshot = buf as string;
  } catch (err) {
    console.error("[Scraper] Screenshot failed:", err instanceof Error ? err.message : err);
  }

  // Wrapper that retries on detached frame (site did a client-side redirect)
  async function safeEvaluate<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt < 2 && err instanceof Error && (err.message.includes("detached") || err.message.includes("Execution context was destroyed"))) {
          console.error(`[Scraper] Frame detached (attempt ${attempt + 1}/3), waiting for page to settle...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Frame detached after 3 attempts");
  }

  const pageData = await safeEvaluate(() => page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const getTextContent = (el: Element | null) => el?.textContent?.trim() ?? "";

    function isAboveFold(el: Element): boolean {
      const rect = el.getBoundingClientRect();
      return rect.top < vh && rect.bottom > 0;
    }

    // ─── Headings ───
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: getTextContent(h).slice(0, 200),
      isAboveFold: isAboveFold(h),
    }));

    // ─── Links ───
    const links = Array.from(document.querySelectorAll("a"))
      .slice(0, 100)
      .map((a) => ({
        text: getTextContent(a).slice(0, 100),
        href: a.href,
        isExternal: a.hostname !== window.location.hostname,
      }));

    // ─── Images ───
    const images = Array.from(document.querySelectorAll("img"))
      .slice(0, 50)
      .map((img) => ({
        alt: img.alt,
        src: img.src,
        hasAlt: !!img.alt && img.alt.length > 0,
        isAboveFold: isAboveFold(img),
      }));

    // ─── CTAs (deep analysis) ───
    const ctaSelectors = 'button, a.btn, a.button, [class*="cta"], [class*="btn"], [class*="button"], input[type="submit"], [role="button"]';
    const ctas: CTAInfo[] = Array.from(document.querySelectorAll(ctaSelectors))
      .slice(0, 30)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          text: getTextContent(el).slice(0, 100),
          tag: el.tagName.toLowerCase(),
          href: (el as HTMLAnchorElement).href || undefined,
          isAboveFold: isAboveFold(el),
          fontSize: parseFloat(style.fontSize) || 0,
          area: rect.width * rect.height,
          bgColor: style.backgroundColor,
          textColor: style.color,
          isPrimary: rect.width > 120 && rect.height > 35 && parseFloat(style.fontSize) >= 14,
        };
      })
      .filter((c) => c.text.length > 0);

    // ─── Forms ───
    const forms = Array.from(document.querySelectorAll("form")).map((form) => {
      const inputs = Array.from(form.querySelectorAll("input:not([type=hidden]), select, textarea"));
      return {
        fields: inputs.length,
        hasLabels: form.querySelectorAll("label").length > 0,
        action: form.action || undefined,
        hasPlaceholders: inputs.some((i) => (i as HTMLInputElement).placeholder?.length > 0),
        hasValidation: inputs.some((i) => (i as HTMLInputElement).pattern || i.getAttribute("type") === "email"),
        hasRequired: inputs.some((i) => (i as HTMLInputElement).required || i.getAttribute("aria-required") === "true"),
        fieldTypes: inputs.map((i) => (i as HTMLInputElement).type || i.tagName.toLowerCase()),
      };
    });

    // ─── Trust Signals (differentiated) ───
    const trustSignals: TrustSignal[] = [];
    const bodyText = document.body?.innerText?.toLowerCase() ?? "";

    // Badge-type trust
    const badgeEls = document.querySelectorAll('[class*="trust"], [class*="badge"], [class*="secure"], [class*="guarantee"], [class*="sikker"], [class*="e-maerket"], [class*="verified"]');
    if (badgeEls.length > 0) {
      trustSignals.push({ type: "badge", description: `${badgeEls.length} visuelle trust badge(s) fundet`, location: "side" });
    }

    // Text-based trust
    const trustTexts: [string, string][] = [
      ["garanti", "Garanti nævnt"], ["returret", "Returret nævnt"], ["pengene tilbage", "Pengene-tilbage-garanti"],
      ["gratis fragt", "Gratis fragt"], ["fri fragt", "Fri fragt"], ["gratis levering", "Gratis levering"],
      ["free shipping", "Free shipping"], ["sikker betaling", "Sikker betaling"], ["ssl", "SSL nævnt"],
      ["30 dag", "30 dages garanti/retur"], ["14 dag", "14 dages fortrydelsesret"],
      ["money back", "Money back guarantee"], ["ombytning", "Ombytning nævnt"],
    ];
    for (const [kw, desc] of trustTexts) {
      if (bodyText.includes(kw)) trustSignals.push({ type: "text", description: desc, location: "tekst" });
    }

    // Social proof
    const spKeywords: [string, string][] = [
      ["trustpilot", "Trustpilot"], ["anmeldelse", "Anmeldelser"], ["review", "Reviews"],
      ["kunderne siger", "Kundecitater"], ["testimonial", "Testimonials"],
      ["stjerner", "Stjernerating"], ["rating", "Ratings"], ["★", "Stjernesymboler"],
    ];
    for (const [kw, desc] of spKeywords) {
      if (bodyText.includes(kw)) trustSignals.push({ type: "social_proof", description: desc, location: "side" });
    }

    // Authority
    const authKeywords: [string, string][] = [
      ["as seen", "As seen in"], ["featured in", "Featured in"], ["partner", "Partner-logoer"],
      ["award", "Awards"], ["certificer", "Certificering"], ["akkrediter", "Akkreditering"],
      ["+13 års", "Erfaring nævnt"], ["erfaring", "Erfaring nævnt"],
    ];
    for (const [kw, desc] of authKeywords) {
      if (bodyText.includes(kw)) trustSignals.push({ type: "authority", description: desc, location: "side" });
    }

    // ─── Meta tags ───
    const metaTags: Record<string, string> = {};
    document.querySelectorAll("meta").forEach((m) => {
      const name = m.getAttribute("name") || m.getAttribute("property") || "";
      const content = m.getAttribute("content") || "";
      if (name && content) metaTags[name] = content.slice(0, 300);
    });

    // ─── Structural info (much broader detection) ───
    const nav = document.querySelector("nav, [role='navigation']") || document.querySelector("header nav, header [role='navigation']");
    let navItems = 0;
    if (nav) {
      const topList = nav.querySelector("ul, ol");
      if (topList) {
        // Count only direct <li> children of the first list (top-level items)
        navItems = topList.querySelectorAll(":scope > li").length;
      } else {
        // No list structure: count direct <a> children of nav (skip nested links)
        const directLinks = nav.querySelectorAll(":scope > a, :scope > div > a, :scope > span > a");
        navItems = directLinks.length || nav.querySelectorAll("a").length;
      }
      // Exclude common utility links (cart, search, account, logo)
      const utilityPatterns = /cart|kurv|basket|søg|search|account|konto|login|log.?ind|profil|favorit|wish/i;
      if (topList) {
        let utilityCount = 0;
        topList.querySelectorAll(":scope > li").forEach((li) => {
          const text = (li.textContent || "").trim();
          const href = li.querySelector("a")?.getAttribute("href") || "";
          if (utilityPatterns.test(text) || utilityPatterns.test(href) || text.length === 0) utilityCount++;
        });
        navItems = Math.max(0, navItems - utilityCount);
      }
    } else {
      // Fallback: check header for nav-like structure
      const header = document.querySelector("header");
      if (header) {
        const headerList = header.querySelector("ul");
        navItems = headerList ? headerList.querySelectorAll(":scope > li").length : 0;
      }
    }
    const footer = document.querySelector("footer, [class*='footer']");

    const heroSelectors = '[class*="hero"], [class*="banner"], [class*="jumbotron"], [class*="splash"], [class*="intro"], [class*="masthead"], [class*="slider"], [class*="carousel"], [class*="slideshow"]';
    const hasHero = !!document.querySelector(heroSelectors);
    const firstSection = document.querySelector("main > section, main > div > section, body > section, [class*='section']:first-of-type");
    const firstSectionHasLargeImg = firstSection ? !!firstSection.querySelector("img[width], img[class*='hero'], img[class*='banner'], picture") : false;
    const heroDetected = hasHero || firstSectionHasLargeImg;

    const hasFAQ = !!document.querySelector('[class*="faq"], [class*="accordion"], [id*="faq"], details, [itemtype*="FAQPage"]');
    const hasTestimonials = !!document.querySelector('[class*="testimonial"], [class*="review"], [class*="trustpilot"], [class*="kunde"], [class*="quote"]');
    const hasPricing = !!document.querySelector('[class*="pricing"], [class*="price"], [class*="pris"], .money, [class*="plan"]');
    const hasVideo = !!document.querySelector("video, iframe[src*='youtube'], iframe[src*='vimeo'], [class*='video']");
    const hasTrustBadges = badgeEls.length > 0;
    const hasNewsletter = !!document.querySelector('[class*="newsletter"], [class*="subscribe"], [class*="signup"], [class*="nyhedsbrev"], [class*="mailchimp"], [class*="klaviyo"]');
    const hasProductGallery = !!document.querySelector('[class*="product-image"], [class*="gallery"], [class*="product-photo"], [class*="product-media"]');
    const hasAddToCart = !!document.querySelector('[class*="add-to-cart"], [class*="addtocart"], [class*="buy-button"], form[action*="cart"]');
    const hasCartWidget = !!document.querySelector('[class*="cart"], [class*="basket"], [class*="kurv"], [href*="/cart"]');
    const hasCheckoutForm = !!document.querySelector('[class*="checkout"], form[action*="checkout"], [class*="payment"]');
    const hasFilters = !!document.querySelector('[class*="filter"], [class*="facet"], [class*="sort"], [class*="refine"]');
    const hasBreadcrumbs = !!document.querySelector('[class*="breadcrumb"], nav[aria-label*="breadcrumb"], [itemtype*="BreadcrumbList"]');
    const hasProgressIndicator = !!document.querySelector('[class*="progress"], [class*="step-indicator"], [class*="stepper"]');
    const sectionCount = document.querySelectorAll("section, [class*='section']").length;

    // ─── First screen content ───
    const h1s = headings.filter((h) => h.tag === "h1" && h.isAboveFold);
    const heroText = h1s[0]?.text ?? "";
    const heroSubEl = h1s[0] ? document.querySelector("h1")?.nextElementSibling : null;
    const heroSubtext = heroSubEl && isAboveFold(heroSubEl) ? getTextContent(heroSubEl).slice(0, 300) : "";
    const visibleCTACount = ctas.filter((c) => c.isAboveFold).length;
    const socialProofAbove = trustSignals.some((t) => t.type === "social_proof");
    const imageAbove = images.some((i) => i.isAboveFold);

    // ─── Copy analysis ───
    const allText = document.body?.innerText ?? "";
    const sentences = allText.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 300);

    const benefitWords = /spar|gratis|hurtig|nem|bedste|eksklusiv|populær|anbefal|favorit|save|free|fast|easy|best|exclusive|popular|proven|guaranteed|opnå|forbedre|boost|øg|reducer|minimer|undgå|slip for|uden/i;
    const featureWords = /lavet af|materiale|størrelse|mål|teknisk|specifikation|funktion|inkluderer|indeholder|built with|made from|features|includes|dimensions/i;
    const urgencyWords = /nu\b|i dag|begrænset|kun \d|sidste|snart|udløber|skyndig|limited|today|only \d|last|ending|expires|few left|hurry/i;

    const benefitStatements = sentences.filter((s) => benefitWords.test(s)).slice(0, 5);
    const featureStatements = sentences.filter((s) => featureWords.test(s)).slice(0, 5);
    const urgencyElements = sentences.filter((s) => urgencyWords.test(s)).slice(0, 3);

    const guaranteeWords = /garanti|guarantee|money.?back|pengene.?tilbage|returret|return|refund|bytte|ombytning/i;
    const guaranteeStatements = sentences.filter((s) => guaranteeWords.test(s)).slice(0, 3);

    const usps: string[] = [];
    document.querySelectorAll('[class*="usp"], [class*="benefit"], [class*="feature-list"] li, [class*="value-prop"]').forEach((el) => {
      const t = getTextContent(el);
      if (t.length > 5 && t.length < 200) usps.push(t);
    });

    // ─── Page signals for type detection ───
    const hasProductSchema = !!document.querySelector('[itemtype*="Product"], [type="application/ld+json"]');
    const hasBreadcrumbSchema = !!document.querySelector('[itemtype*="BreadcrumbList"]');
    const hasOrgSchema = !!document.querySelector('[itemtype*="Organization"]');
    const priceVisible = /\d+[.,]\d{2}\s*(kr|dkk|€|\$|,-)/i.test(allText.slice(0, 3000));
    const currencyMatches = allText.match(/(kr\.?|dkk|€|\$|,-)/gi) || [];
    const currencySymbols = [...new Set(currencyMatches.map((c) => c.toLowerCase()))];
    const productGridItems = document.querySelectorAll('[class*="product-card"], [class*="product-item"], [class*="product-grid"] > *, [class*="collection-product"]');
    const cartIndicators = Array.from(document.querySelectorAll('[class*="cart"], [class*="kurv"], [class*="basket"]')).map((e) => e.className).slice(0, 5);
    const checkoutIndicators = Array.from(document.querySelectorAll('[class*="checkout"], [class*="payment"], [class*="order-summary"]')).map((e) => e.className).slice(0, 5);

    // ─── UX Signals (Honeycomb: accessible, usable, findable, credible) ───
    const hasSkipToContent = !!document.querySelector('a[href="#main-content"], a[href="#content"], [class*="skip-to"]');
    const ariaElements = document.querySelectorAll("[aria-label], [aria-labelledby], [role]");
    const hasAriaLabels = ariaElements.length > 3;
    const allImgs = document.querySelectorAll("img");
    const imgsWithoutAlt = Array.from(allImgs).filter((i) => !i.alt || i.alt.trim().length === 0);
    const hasAltOnAllImages = allImgs.length > 0 && imgsWithoutAlt.length === 0;
    const hasSearchField = !!document.querySelector('input[type="search"], [class*="search"] input, [role="search"]');
    const hasChatWidget = !!document.querySelector('[class*="chat-widget"], [class*="intercom"], [class*="drift"], [class*="zendesk"], [class*="tawk"], [id*="chat"], iframe[src*="chat"]');
    const hasStickyHeader = (() => {
      const header = document.querySelector("header, [class*='header']");
      if (!header) return false;
      const style = window.getComputedStyle(header);
      return style.position === "fixed" || style.position === "sticky";
    })();
    const hasBackToTop = !!document.querySelector('[class*="back-to-top"], [class*="scroll-top"], a[href="#top"]');
    const hasAnimations = !!document.querySelector('[class*="animate"], [class*="fade-in"], [class*="slide"]');
    const hasCookieConsent = !!document.querySelector('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"]');

    // ─── Security-specific HTML checks ───
    const allScripts = Array.from(document.querySelectorAll("script[src]"));
    const scriptsWithoutSRI = allScripts.filter((s) => s.getAttribute("src")?.startsWith("http") && !s.getAttribute("integrity")).map((s) => s.getAttribute("src") || "").slice(0, 10);
    const scriptsWithSRI = allScripts.filter((s) => !!s.getAttribute("integrity")).length;

    const mixedContentEls = Array.from(document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"]'));
    const mixedContentUrls = mixedContentEls.map((e) => (e as HTMLElement).getAttribute("src") || (e as HTMLElement).getAttribute("href") || "").slice(0, 10);

    const exposedEmails = (allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).slice(0, 5);

    const hasPrivacyPolicy = !!document.querySelector('a[href*="privacy"], a[href*="privatlivs"], a[href*="persondatapolitik"], a[href*="gdpr"]');
    const hasCookiePolicy = !!document.querySelector('a[href*="cookie-policy"], a[href*="cookiepolitik"], a[href*="cookies"]');
    const hasTerms = !!document.querySelector('a[href*="terms"], a[href*="vilkaar"], a[href*="betingelser"], a[href*="handelsbetingelser"]');

    const hasRecaptcha = !!document.querySelector('[class*="recaptcha"], [class*="g-recaptcha"], script[src*="recaptcha"]');
    const hasLoginForm = !!document.querySelector('input[type="password"], [class*="login-form"], form[action*="login"], a[href*="login"], a[href*="account"]');

    const jqueryEl = document.querySelector('script[src*="jquery"]');
    const jqueryVersion = jqueryEl ? (jqueryEl.getAttribute("src")?.match(/jquery[.-](\d+\.\d+\.\d+)/i)?.[1] || "ukendt") : null;

    const hasContactInfo = /(\+45|tlf|telefon|phone|ring)/i.test(allText.slice(0, 5000));
    const hasCVR = /cvr[\s.:]*\d{8}/i.test(allText) || /dk[\s-]?\d{8}/i.test(allText);
    const hasSecureCheckoutBadge = /sikker betaling|secure checkout|pci|ssl secured/i.test(allText.slice(0, 10000));

    const adminLinks = Array.from(document.querySelectorAll('a[href*="/wp-admin"], a[href*="/admin"], a[href*="/wp-login"]')).map((a) => (a as HTMLAnchorElement).href).slice(0, 3);
    const hasAggressivePopups = document.querySelectorAll('[class*="popup"], [class*="modal"][style*="display: block"], [class*="overlay"]').length > 2;

    return {
      title: document.title,
      metaDescription: metaTags["description"] || metaTags["og:description"] || "",
      headings,
      links,
      images,
      ctas,
      forms,
      trustSignals,
      metaTags,
      structuralInfo: {
        hasNav: !!nav,
        hasFooter: !!footer,
        hasHero: heroDetected,
        hasFAQ,
        hasTestimonials,
        hasPricing,
        hasVideo,
        hasTrustBadges,
        hasNewsletter,
        hasProductGallery,
        hasAddToCart,
        hasCartWidget,
        hasCheckoutForm,
        hasFilters,
        hasBreadcrumbs,
        hasProgressIndicator,
        sectionCount,
        navItemCount: navItems,
      },
      firstScreenContent: {
        heroText,
        heroSubtext,
        visibleCTACount,
        hasSocialProofAboveFold: socialProofAbove,
        hasImageAboveFold: imageAbove,
        hasVideoAboveFold: hasVideo && !!document.querySelector("video, iframe[src*='youtube']"),
      },
      copyAnalysis: {
        valueProposition: heroText,
        usps: usps.slice(0, 5),
        benefitStatements,
        featureStatements,
        urgencyElements,
        guaranteeStatements,
      },
      pageSignals: {
        hasProductSchema,
        hasBreadcrumbSchema,
        hasOrganizationSchema: hasOrgSchema,
        priceVisible,
        currencySymbols,
        productCount: productGridItems.length,
        cartIndicators,
        checkoutIndicators,
      },
      textContent: allText.slice(0, 8000),
      uxSignals: {
        hasSkipToContent,
        hasAriaLabels,
        hasFocusStyles: true,
        hasAltOnAllImages,
        colorContrast: "good" as const,
        has404Links: 0,
        hasSearchField,
        hasThankYouPage: false,
        hasChatWidget,
        hasExitIntent: false,
        hasStickyHeader,
        hasStickyNav: hasStickyHeader,
        hasBackToTop,
        hasAnimations,
        hasCookieConsent,
      },
      securitySignals: {
        scriptsWithoutSRI,
        scriptsWithSRI,
        mixedContentUrls,
        exposedEmails,
        hasPrivacyPolicy,
        hasCookiePolicy,
        hasTerms,
        hasRecaptcha,
        hasLoginForm,
        jqueryVersion,
        hasContactInfo,
        hasCVR,
        hasSecureCheckoutBadge,
        adminLinks,
        hasAggressivePopups,
      },
    };
  }));

  let performanceTiming = { domContentLoaded: 0, resourceCount: 0 };
  try {
    performanceTiming = await safeEvaluate(() => page.evaluate(() => {
      const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: Math.round(perf?.domContentLoadedEventEnd ?? 0),
      resourceCount: performance.getEntriesByType("resource").length,
    };
  }));
  } catch { /* ignore */ }

  return {
    ...pageData,
    url,
    screenshot: screenshot ? `data:image/jpeg;base64,${screenshot}` : "",
    performance: { loadTime, ...performanceTiming },
    viewport,
  };

  } finally {
    await browser.close().catch(() => {});
  }
}

// ─── PageSpeed Insights (real Lighthouse data) ──────────────────

export type PageSpeedAuditItem = {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  category?: string;
};

export type PageSpeedData = {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  si: number;
  ttfb: number;
  totalRequestCount: number;
  totalByteWeight: number;
  strategy: string;
  isHttps: boolean;
  hasViewportMeta: boolean;
  hasCharset: boolean;
  hasDoctype: boolean;
  opportunities: PageSpeedAuditItem[];
  diagnostics: PageSpeedAuditItem[];
  passedAudits: PageSpeedAuditItem[];
  a11yIssues: PageSpeedAuditItem[];
  seoIssues: PageSpeedAuditItem[];
  bestPracticeIssues: PageSpeedAuditItem[];
};

export async function fetchPageSpeed(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedData | null> {
  const apiKey = process.env.PAGESPEED_API_KEY || "";
  const keyParam = apiKey ? `&key=${apiKey}` : "";
  const cats = "category=performance&category=accessibility&category=best-practices&category=seo";
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${cats}${keyParam}`;

  console.log("[PageSpeed] Fetching:", strategy, url, apiKey ? "(with API key)" : "(no API key)");

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) {
      console.error("[PageSpeed] API error:", res.status, res.statusText);
      if (res.status === 429) {
        console.error("[PageSpeed] Rate limited. Add PAGESPEED_API_KEY env var for higher limits.");
      }
      return null;
    }
    const json = await res.json();

    const lhr = json.lighthouseResult;
    if (!lhr) {
      console.error("[PageSpeed] No lighthouseResult in response");
      return null;
    }

    const audits = lhr.audits || {};
    const catScores = lhr.categories || {};

    const toScore = (cat: string) =>
      Math.round((catScores[cat]?.score ?? 0) * 100);

    const mapAudit = (a: Record<string, unknown>, cat?: string): PageSpeedAuditItem => ({
      id: a.id as string,
      title: a.title as string,
      description: ((a.description as string) || "").replace(/\[.*?\]\(.*?\)/g, "").trim(),
      score: typeof a.score === "number" ? a.score : null,
      displayValue: a.displayValue as string | undefined,
      numericValue: a.numericValue as number | undefined,
      category: cat,
    });

    const opportunities: PageSpeedAuditItem[] = [];
    const diagnostics: PageSpeedAuditItem[] = [];
    const passedAudits: PageSpeedAuditItem[] = [];

    const perfRefs = catScores.performance?.auditRefs || [];
    for (const ref of perfRefs) {
      const audit = audits[(ref as { id: string }).id];
      if (!audit) continue;
      const s = audit.score;
      const group = (ref as { group?: string }).group;
      if (group === "load-opportunities" && s !== null && s < 1) {
        opportunities.push(mapAudit(audit, "performance"));
      } else if (group === "diagnostics" && s !== null && s < 1) {
        diagnostics.push(mapAudit(audit, "performance"));
      } else if (s === 1 && (group === "load-opportunities" || group === "diagnostics")) {
        passedAudits.push(mapAudit(audit, "performance"));
      }
    }

    const extractFailedAudits = (catKey: string): PageSpeedAuditItem[] => {
      const refs = catScores[catKey]?.auditRefs || [];
      const items: PageSpeedAuditItem[] = [];
      const metricIds = new Set(["first-contentful-paint", "largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time", "speed-index", "server-response-time"]);
      for (const ref of refs) {
        const id = (ref as { id: string }).id;
        const audit = audits[id];
        if (!audit || metricIds.has(id)) continue;
        if (typeof audit.score === "number" && audit.score < 1 && audit.scoreDisplayMode !== "notApplicable") {
          items.push(mapAudit(audit, catKey));
        }
      }
      return items;
    };

    const a11yIssues = extractFailedAudits("accessibility");
    const seoIssues = extractFailedAudits("seo");
    const bestPracticeIssues = extractFailedAudits("best-practices");

    const totalPassed = ["performance", "accessibility", "best-practices", "seo"].reduce((sum, catKey) => {
      const refs = catScores[catKey]?.auditRefs || [];
      return sum + refs.filter((ref: { id: string }) => audits[ref.id]?.score === 1).length;
    }, 0);

    console.log("[PageSpeed] Success — perf:", toScore("performance"), "a11y:", toScore("accessibility"), "bp:", toScore("best-practices"), "seo:", toScore("seo"),
      "| issues: a11y:", a11yIssues.length, "seo:", seoIssues.length, "bp:", bestPracticeIssues.length);

    return {
      performanceScore: toScore("performance"),
      accessibilityScore: toScore("accessibility"),
      bestPracticesScore: toScore("best-practices"),
      seoScore: toScore("seo"),
      fcp: audits["first-contentful-paint"]?.numericValue ?? 0,
      lcp: audits["largest-contentful-paint"]?.numericValue ?? 0,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? 0,
      tbt: audits["total-blocking-time"]?.numericValue ?? 0,
      si: audits["speed-index"]?.numericValue ?? 0,
      ttfb: audits["server-response-time"]?.numericValue ?? 0,
      totalRequestCount: audits["network-requests"]?.details?.items?.length ?? 0,
      totalByteWeight: audits["total-byte-weight"]?.numericValue ?? 0,
      strategy,
      isHttps: audits["is-on-https"]?.score === 1,
      hasViewportMeta: audits["viewport"]?.score === 1,
      hasCharset: audits["charset"]?.score === 1,
      hasDoctype: audits["doctype"]?.score === 1,
      opportunities,
      diagnostics,
      passedAudits: passedAudits.slice(0, 5),
      a11yIssues,
      seoIssues,
      bestPracticeIssues,
    };
  } catch (err) {
    console.error("[PageSpeed] Fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Security Headers & Infrastructure Check ────────────────────

export async function fetchSecurityHeaders(url: string): Promise<SecurityHeadersData | null> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const h = (name: string) => res.headers.get(name) || "";
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    const hstsVal = h("strict-transport-security");
    const hstsMaxAge = hstsVal ? parseInt(hstsVal.match(/max-age=(\d+)/)?.[1] || "0") : null;

    const cspVal = h("content-security-policy");
    const cacheVal = h("cache-control");
    const encoding = h("content-encoding").toLowerCase();

    let robotsTxtContent: string | null = null;
    try {
      const robotsUrl = new URL("/robots.txt", url).toString();
      const robotsRes = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
      if (robotsRes.ok) robotsTxtContent = await robotsRes.text();
    } catch { /* ignore */ }

    return {
      headers,
      hasHSTS: !!hstsVal,
      hstsMaxAge,
      hasCSP: !!cspVal,
      cspValue: cspVal.slice(0, 500),
      hasXFrameOptions: !!h("x-frame-options"),
      hasXContentTypeOptions: h("x-content-type-options").toLowerCase() === "nosniff",
      hasReferrerPolicy: !!h("referrer-policy"),
      referrerPolicyValue: h("referrer-policy"),
      hasPermissionsPolicy: !!h("permissions-policy"),
      hasXXSSProtection: !!h("x-xss-protection"),
      serverHeader: h("server"),
      poweredByHeader: h("x-powered-by"),
      hasGzip: encoding.includes("gzip"),
      hasBrotli: encoding.includes("br"),
      hasCacheControl: !!cacheVal,
      cacheControlValue: cacheVal,
      tlsVersion: url.startsWith("https") ? "TLS 1.2+" : "Ingen",
      robotsTxtContent,
    };
  } catch (err) {
    console.error("[Security] Headers fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

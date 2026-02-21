import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

const CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.tar";

export type ScrapedData = {
  title: string;
  metaDescription: string;
  url: string;
  screenshot: string;
  headings: { tag: string; text: string }[];
  links: { text: string; href: string; isExternal: boolean }[];
  images: { alt: string; src: string; hasAlt: boolean }[];
  ctas: { text: string; type: string; href?: string }[];
  forms: { fields: number; hasLabels: boolean }[];
  socialProof: string[];
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
    sectionCount: number;
  };
  textContent: string;
  viewport: "desktop" | "mobile";
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
  const page = await browser.newPage();

  if (viewport === "mobile") {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    );
  } else {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  }

  const startTime = Date.now();

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  const loadTime = Date.now() - startTime;

  await new Promise((r) => setTimeout(r, 2000));

  const screenshot = await page.screenshot({
    encoding: "base64",
    fullPage: false,
    type: "jpeg",
    quality: 80,
  });

  const pageData = await page.evaluate(() => {
    const getTextContent = (el: Element | null) =>
      el?.textContent?.trim() ?? "";

    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6")
    ).map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: getTextContent(h).slice(0, 200),
    }));

    const links = Array.from(document.querySelectorAll("a")).map((a) => ({
      text: getTextContent(a).slice(0, 100),
      href: a.href,
      isExternal: a.hostname !== window.location.hostname,
    }));

    const images = Array.from(document.querySelectorAll("img")).map((img) => ({
      alt: img.alt,
      src: img.src,
      hasAlt: !!img.alt && img.alt.length > 0,
    }));

    const buttonTexts = Array.from(
      document.querySelectorAll(
        'button, a.btn, a.button, [class*="cta"], [class*="btn"], input[type="submit"]'
      )
    ).map((el) => ({
      text: getTextContent(el).slice(0, 100),
      type: el.tagName.toLowerCase(),
      href: (el as HTMLAnchorElement).href || undefined,
    }));

    const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
      fields: form.querySelectorAll("input, select, textarea").length,
      hasLabels: form.querySelectorAll("label").length > 0,
    }));

    const bodyText = document.body?.innerText ?? "";
    const socialProofKeywords = [
      "trustpilot",
      "anmeldelse",
      "review",
      "kunderne siger",
      "testimonial",
      "stjerner",
      "stars",
      "rating",
      "kunder",
      "customers",
      "trusted by",
      "as seen",
      "featured in",
    ];
    const socialProof = socialProofKeywords.filter((kw) =>
      bodyText.toLowerCase().includes(kw)
    );

    const metaTags: Record<string, string> = {};
    document.querySelectorAll("meta").forEach((meta) => {
      const name =
        meta.getAttribute("name") || meta.getAttribute("property") || "";
      const content = meta.getAttribute("content") || "";
      if (name && content) metaTags[name] = content.slice(0, 300);
    });

    const nav = document.querySelector("nav, [role='navigation']");
    const footer = document.querySelector("footer");
    const hero = document.querySelector(
      '[class*="hero"], [class*="banner"], [class*="jumbotron"]'
    );
    const faq = document.querySelector(
      '[class*="faq"], [class*="accordion"], [id*="faq"]'
    );
    const testimonials = document.querySelector(
      '[class*="testimonial"], [class*="review"], [class*="trustpilot"]'
    );
    const pricing = document.querySelector(
      '[class*="pricing"], [class*="price"], [class*="plan"]'
    );
    const video = document.querySelector("video, iframe[src*='youtube'], iframe[src*='vimeo']");
    const trustBadges = document.querySelector(
      '[class*="trust"], [class*="badge"], [class*="secure"], [class*="guarantee"]'
    );
    const newsletter = document.querySelector(
      '[class*="newsletter"], [class*="subscribe"], [class*="signup"]'
    );
    const sections = document.querySelectorAll("section");

    return {
      title: document.title,
      metaDescription:
        metaTags["description"] ||
        metaTags["og:description"] ||
        "",
      headings,
      links: links.slice(0, 100),
      images: images.slice(0, 50),
      ctas: buttonTexts.slice(0, 30),
      forms,
      socialProof,
      metaTags,
      structuralInfo: {
        hasNav: !!nav,
        hasFooter: !!footer,
        hasHero: !!hero,
        hasFAQ: !!faq,
        hasTestimonials: !!testimonials,
        hasPricing: !!pricing,
        hasVideo: !!video,
        hasTrustBadges: !!trustBadges,
        hasNewsletter: !!newsletter,
        sectionCount: sections.length,
      },
      textContent: bodyText.slice(0, 8000),
    };
  });

  const performanceTiming = await page.evaluate(() => {
    const perf = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: Math.round(perf?.domContentLoadedEventEnd ?? 0),
      resourceCount: performance.getEntriesByType("resource").length,
    };
  });

  await browser.close();

  return {
    ...pageData,
    url,
    screenshot: `data:image/jpeg;base64,${screenshot}`,
    performance: {
      loadTime,
      ...performanceTiming,
    },
    viewport,
  };
}

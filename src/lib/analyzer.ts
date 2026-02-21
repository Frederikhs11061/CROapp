import OpenAI from "openai";
import { CRO_SYSTEM_PROMPT, type AnalysisResult } from "./cro-knowledge";
import type { ScrapedData } from "./scraper";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeWithAI(
  scrapedData: ScrapedData
): Promise<AnalysisResult> {
  const userPrompt = buildUserPrompt(scrapedData);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: CRO_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: scrapedData.screenshot,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 8000,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as AnalysisResult;
}

function buildUserPrompt(data: ScrapedData): string {
  return `Analysér denne hjemmeside for CRO (Conversion Rate Optimization).

## WEBSITE INFO
- URL: ${data.url}
- Titel: ${data.title}
- Meta Description: ${data.metaDescription}
- Viewport: ${data.viewport}

## SIDE-STRUKTUR
- Navigation: ${data.structuralInfo.hasNav ? "Ja" : "Nej"}
- Footer: ${data.structuralInfo.hasFooter ? "Ja" : "Nej"}
- Hero-sektion: ${data.structuralInfo.hasHero ? "Ja" : "Nej"}
- FAQ: ${data.structuralInfo.hasFAQ ? "Ja" : "Nej"}
- Testimonials: ${data.structuralInfo.hasTestimonials ? "Ja" : "Nej"}
- Pricing: ${data.structuralInfo.hasPricing ? "Ja" : "Nej"}
- Video: ${data.structuralInfo.hasVideo ? "Ja" : "Nej"}
- Trust Badges: ${data.structuralInfo.hasTrustBadges ? "Ja" : "Nej"}
- Nyhedsbrev: ${data.structuralInfo.hasNewsletter ? "Ja" : "Nej"}
- Antal sektioner: ${data.structuralInfo.sectionCount}

## HEADINGS
${data.headings.map((h) => `${h.tag}: ${h.text}`).join("\n")}

## CTA-KNAPPER / BUTTONS
${data.ctas.map((c) => `[${c.type}] ${c.text}`).join("\n") || "Ingen fundet"}

## BILLEDER
- Antal: ${data.images.length}
- Med alt-tekst: ${data.images.filter((i) => i.hasAlt).length}
- Uden alt-tekst: ${data.images.filter((i) => !i.hasAlt).length}

## FORMULARER
${data.forms.map((f) => `Formular med ${f.fields} felter, labels: ${f.hasLabels}`).join("\n") || "Ingen formularer"}

## SOCIAL PROOF FUNDET
${data.socialProof.length > 0 ? data.socialProof.join(", ") : "Intet social proof fundet"}

## LINKS
- Interne: ${data.links.filter((l) => !l.isExternal).length}
- Eksterne: ${data.links.filter((l) => l.isExternal).length}

## PERFORMANCE
- Load tid: ${data.performance.loadTime}ms
- DOM Content Loaded: ${data.performance.domContentLoaded}ms
- Antal resourcer: ${data.performance.resourceCount}

## TEKSTINDHOLD (udsnit)
${data.textContent.slice(0, 4000)}

## SCREENSHOT
Se det vedhæftede screenshot af siden (above the fold view).

Analysér nu siden grundigt baseret på alle CRO-principper og returner din analyse som JSON.`;
}

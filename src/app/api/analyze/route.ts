import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite, fetchPageSpeed } from "@/lib/scraper";
import type { PageSpeedData } from "@/lib/scraper";
import { analyzeWebsite } from "@/lib/analyzer";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, viewport = "desktop" } = body;

    if (!url) {
      return NextResponse.json({ error: "URL er påkrævet" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Ugyldig URL" }, { status: 400 });
    }

    const fullUrl = parsedUrl.toString();
    const strat = viewport === "mobile" ? "mobile" as const : "desktop" as const;

    const [scrapedData, pageSpeed] = await Promise.all([
      scrapeWebsite(fullUrl, viewport),
      fetchPageSpeed(fullUrl, strat).catch((err): PageSpeedData | null => {
        console.error("[API] PageSpeed failed, continuing without:", err);
        return null;
      }),
    ]);

    console.log("[API] PageSpeed result:", pageSpeed ? "OK" : "null");

    const analysis = analyzeWebsite(scrapedData, pageSpeed);

    console.log("[API] technicalHealth:", analysis.technicalHealth ? "present" : "null");

    return NextResponse.json({
      success: true,
      analysis,
      screenshot: scrapedData.screenshot,
      url: fullUrl,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Ukendt fejl opstod";
    return NextResponse.json(
      { error: `Analyse fejlede: ${message}` },
      { status: 500 }
    );
  }
}

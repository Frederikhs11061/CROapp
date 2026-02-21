import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite, fetchPageSpeed } from "@/lib/scraper";
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

    // Run scraping and PageSpeed in parallel
    const [scrapedData, pageSpeed] = await Promise.all([
      scrapeWebsite(fullUrl, viewport),
      fetchPageSpeed(fullUrl, viewport === "mobile" ? "mobile" : "desktop"),
    ]);

    const analysis = analyzeWebsite(scrapedData, pageSpeed);

    return NextResponse.json({
      success: true,
      analysis,
      screenshot: scrapedData.screenshot,
      url: fullUrl,
      scrapedAt: new Date().toISOString(),
      pageSpeed,
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

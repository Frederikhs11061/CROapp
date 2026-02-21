import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeWithAI } from "@/lib/analyzer";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, viewport = "desktop" } = body;

    if (!url) {
      return NextResponse.json({ error: "URL er påkrævet" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(
        url.startsWith("http") ? url : `https://${url}`
      );
    } catch {
      return NextResponse.json({ error: "Ugyldig URL" }, { status: 400 });
    }

    const scrapedData = await scrapeWebsite(parsedUrl.toString(), viewport);

    const analysis = await analyzeWithAI(scrapedData);

    return NextResponse.json({
      success: true,
      analysis,
      screenshot: scrapedData.screenshot,
      url: parsedUrl.toString(),
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

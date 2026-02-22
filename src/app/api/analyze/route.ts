import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite, fetchPageSpeed, fetchSecurityHeaders } from "@/lib/scraper";
import type { PageSpeedData, SecurityHeadersData } from "@/lib/scraper";
import { analyzeWebsite } from "@/lib/analyzer";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

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

    const [scrapedData, securityHeaders, pageSpeedDesktop, pageSpeedMobile] = await Promise.all([
      scrapeWebsite(fullUrl, "desktop"),
      fetchSecurityHeaders(fullUrl).catch((): SecurityHeadersData | null => null),
      fetchPageSpeed(fullUrl, "desktop").catch((): PageSpeedData | null => null),
      fetchPageSpeed(fullUrl, "mobile").catch((): PageSpeedData | null => null),
    ]);

    const analysis = analyzeWebsite(scrapedData, pageSpeedDesktop, pageSpeedMobile, securityHeaders);

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

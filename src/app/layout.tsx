import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://croaudit.dk";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CRO Audit Tool – Gratis AI Konverteringsanalyse",
    template: "%s | CRO Audit Tool",
  },
  description:
    "Analysér din webshop gratis med AI. Få konkrete CRO-anbefalinger baseret på 400+ dokumenterede konverteringstiltag.",
  keywords: [
    "CRO",
    "konverteringsoptimering",
    "CRO audit",
    "konverteringsrate",
    "webshop optimering",
    "Shopify CRO",
    "landingsside analyse",
    "conversion rate optimization",
    "gratis CRO analyse",
  ],
  authors: [{ name: "CRO Audit Tool" }],
  creator: "CRO Audit Tool",
  openGraph: {
    type: "website",
    locale: "da_DK",
    url: SITE_URL,
    siteName: "CRO Audit Tool",
    title: "CRO Audit Tool – Gratis AI Konverteringsanalyse",
    description:
      "Analysér din webshop gratis med AI. Få konkrete CRO-anbefalinger baseret på 400+ dokumenterede konverteringstiltag.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "CRO Audit Tool – AI-drevet konverteringsanalyse",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CRO Audit Tool – Gratis AI Konverteringsanalyse",
    description:
      "Analysér din webshop gratis med AI. Få konkrete CRO-anbefalinger baseret på 400+ dokumenterede konverteringstiltag.",
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" className={inter.variable}>
      <head>
        <JsonLd type="organization" />
        <JsonLd type="website" />
        <JsonLd type="softwareApplication" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Header />
        <div id="content">{children}</div>
        <footer className="border-t border-white/5 py-8 px-6">
          <div className="max-w-5xl mx-auto text-center text-sm text-neutral-600">
            <p>&copy; {new Date().getFullYear()} CRO Audit Tool – Bygget med data fra 400+ dokumenterede CRO-tiltag</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

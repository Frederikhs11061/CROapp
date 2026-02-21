import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRO Audit Tool – Konverteringsoptimering",
  description:
    "Analyser din webshop eller hjemmeside for konverteringsproblemer. Få konkrete CRO-anbefalinger baseret på 400+ dokumenterede tiltag.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

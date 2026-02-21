const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://croaudit.dk";
const SITE_NAME = "CRO Audit Tool";

type JsonLdProps = {
  type: "website" | "organization" | "softwareApplication" | "breadcrumb";
  breadcrumbs?: { name: string; url: string }[];
};

export default function JsonLd({ type, breadcrumbs }: JsonLdProps) {
  const schemas: Record<string, object> = {
    website: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "AI-drevet CRO-analyse af din hjemmeside. Få konkrete anbefalinger baseret på 400+ dokumenterede konverteringstiltag.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?url={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      sameAs: [],
    },
    softwareApplication: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "DKK",
      },
      description:
        "Gratis AI-drevet CRO audit tool. Analysér din webshop og få konkrete anbefalinger til at øge konverteringsraten.",
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: (breadcrumbs ?? []).map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    },
  };

  const schema = schemas[type];
  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

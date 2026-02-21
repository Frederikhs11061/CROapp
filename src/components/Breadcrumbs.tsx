import Link from "next/link";
import JsonLd from "./JsonLd";

type Crumb = {
  label: string;
  href: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://croaudit.dk";

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const allCrumbs = [{ label: "Forside", href: "/" }, ...items];

  return (
    <>
      <JsonLd
        type="breadcrumb"
        breadcrumbs={allCrumbs.map((c) => ({
          name: c.label,
          url: `${SITE_URL}${c.href}`,
        }))}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
        <ol className="flex items-center gap-1.5 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
          {allCrumbs.map((crumb, i) => {
            const isLast = i === allCrumbs.length - 1;
            return (
              <li
                key={crumb.href}
                className="flex items-center gap-1.5"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {!isLast ? (
                  <>
                    <Link
                      href={crumb.href}
                      className="hover:text-orange-400 transition-colors"
                      itemProp="item"
                    >
                      <span itemProp="name">{crumb.label}</span>
                    </Link>
                    <span aria-hidden="true" className="text-neutral-600">/</span>
                  </>
                ) : (
                  <span className="text-neutral-300" itemProp="name" aria-current="page">
                    {crumb.label}
                  </span>
                )}
                <meta itemProp="position" content={String(i + 1)} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

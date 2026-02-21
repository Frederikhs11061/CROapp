import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Side ikke fundet",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="pt-16 min-h-[80vh] flex items-center justify-center px-6" id="main-content">
      <div className="text-center max-w-md">
        <p className="text-6xl font-black text-orange-500 mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2">Side ikke fundet</h1>
        <p className="text-neutral-400 mb-8">
          Den side du leder efter findes ikke eller er blevet flyttet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-semibold text-white hover:from-orange-400 hover:to-amber-400 transition-all"
        >
          Gå til forsiden
        </Link>
      </div>
    </main>
  );
}

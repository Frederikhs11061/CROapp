"use client";

import { BarChart3 } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            CRO<span className="text-orange-500">Audit</span>
          </span>
        </a>
        <nav className="flex items-center gap-6 text-sm text-neutral-400">
          <span className="hidden sm:block">Baseret på 400+ dokumenterede CRO-tiltag</span>
        </nav>
      </div>
    </header>
  );
}

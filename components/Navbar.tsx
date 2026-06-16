"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20 transition group-hover:scale-105 sm:h-10 sm:w-10">
            P
          </div>
          <div>
            <p className="text-white font-bold tracking-tight">Poolr</p>
            <p className="hidden text-[11px] uppercase tracking-[0.2em] text-neutral-500 sm:block">
              Premium Pools
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/"
            className={`hidden rounded-xl px-4 py-2 text-sm font-semibold transition sm:inline-flex ${
              pathname === "/"
                ? "bg-white/10 text-white"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Home
          </Link>

          <Link
            href="/join-pool"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition sm:px-4 ${
              pathname === "/join-pool"
                ? "bg-white/10 text-white"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Join
          </Link>

          <Link
            href="/create-pool"
            className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition sm:px-4 ${
              pathname === "/create-pool"
                ? "bg-emerald-400 text-black"
                : "bg-emerald-500 text-black hover:bg-emerald-400"
            }`}
          >
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create Pool</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
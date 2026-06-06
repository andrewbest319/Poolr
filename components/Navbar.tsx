"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20 transition group-hover:scale-105">
            P
          </div>
          <div>
            <p className="text-white font-bold tracking-tight">Poolr</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Premium Pools
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-white/10 text-white"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Home
          </Link>

          <Link
            href="/join-pool"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              pathname === "/join-pool"
                ? "bg-white/10 text-white"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Join
          </Link>

          <Link
            href="/create-pool"
            className={`px-4 py-2 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20 ${
              pathname === "/create-pool"
                ? "bg-emerald-400 text-black"
                : "bg-emerald-500 text-black hover:bg-emerald-400"
            }`}
          >
            Create Pool
          </Link>
        </div>
      </div>
    </header>
  );
}
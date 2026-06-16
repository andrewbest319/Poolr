import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full max-w-full overflow-hidden border-t border-white/10 bg-[#030712]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <Link href="/" className="text-lg font-black tracking-tight text-white">
              Poolr
            </Link>

            <p className="mt-3 text-sm text-zinc-400">Private pools, elevated.</p>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-500">
              Premium golf pools, clean leaderboards, hidden picks, and a better way
              to run tournament action with your group.
            </p>
          </div>

          <nav className="grid gap-3 text-sm text-zinc-400 sm:grid-cols-3 lg:text-right">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <Link href="/pricing" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="/account" className="transition hover:text-white">
              Account Center
            </Link>
            <Link href="/account/settings" className="transition hover:text-white">
              Account Information
            </Link>
            <Link href="/create-pool" className="transition hover:text-white">
              Create Pool
            </Link>
            <Link href="/join-pool" className="transition hover:text-white">
              Join Pool
            </Link>
            <Link href="/golf-pools" className="transition hover:text-white">
              Golf Pools
            </Link>
            <Link href="/pga-golf-pool" className="transition hover:text-white">
              PGA Golf Pool
            </Link>
            <Link href="/fantasy-golf-pool" className="transition hover:text-white">
              Fantasy Golf Pool
            </Link>
            <Link href="/salary-cap-golf-pool" className="transition hover:text-white">
              Salary Cap
            </Link>
            <Link href="/tiered-golf-pool" className="transition hover:text-white">
              Tiered Format
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms and Conditions
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="grid gap-4 text-xs text-zinc-600 lg:grid-cols-[1fr_auto]">
            <p>© 2026 Poolr. All rights reserved.</p>
            <p>
              Poolr is a golf pool software platform. Poolr does not process wagers,
              winnings, bets, or prize pools.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

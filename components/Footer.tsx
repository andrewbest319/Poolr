import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#060816] px-8 py-10 text-white md:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">
              Poolr
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              Private pools, elevated.
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
              Premium golf pools, clean leaderboards, hidden picks, and a better
              way to run tournament action with your group.
            </p>
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>

              <Link href="/pricing" className="transition hover:text-white">
                Pricing
              </Link>

              <Link href="/login" className="transition hover:text-white">
                Login
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
              <Link href="/privacy" className="transition hover:text-cyan-300">
                Privacy Policy
              </Link>

              <Link href="/terms" className="transition hover:text-cyan-300">
                Terms and Conditions
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-zinc-600 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Poolr. All rights reserved.</p>

          <p>
            Poolr is a golf pool software platform. Poolr does not process
            wagers, winnings, bets, or prize pools.
          </p>
        </div>
      </div>
    </footer>
  );
}
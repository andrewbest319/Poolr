import PageWrapper from "../../components/PageWrapper";

const starterFeatures = [
  "Up to 3 members",
  "Basic pool creation",
  "Manual invite sharing",
  "Standard pool setup",
  "Simple roster submission",
  "Great for testing Poolr",
];

const proFeatures = [
  "Unlimited premium pool experience",
  "Live leaderboard presentation",
  "Advanced commissioner controls",
  "Payment status tracking",
  "Hidden picks until lock",
  "Cleaner invite + onboarding flow",
  "Premium pool design + positioning",
];

const featureComparison = [
  {
    label: "Pool size",
    starter: "Up to 3 users",
    pro: "Built for full groups",
  },
  {
    label: "Leaderboard experience",
    starter: "Basic",
    pro: "Premium live mode",
  },
  {
    label: "Commissioner controls",
    starter: "Limited",
    pro: "Advanced",
  },
  {
    label: "Payment tracking",
    starter: "No",
    pro: "Yes",
  },
  {
    label: "Hidden picks",
    starter: "Basic",
    pro: "Full lock logic",
  },
  {
    label: "Overall feel",
    starter: "Starter",
    pro: "High-end",
  },
];

export default function PricingPage() {
  return (
    <PageWrapper>
      <section className="relative mx-auto max-w-7xl px-8 py-14 md:px-12 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Simple pricing, premium experience
          </div>

          <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            Start free.
            <br />
            Upgrade when you want
            <br />
            the real edge.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400 md:text-xl">
            Poolr is built to let casual groups get started quickly, while giving serious
            commissioners a premium pool experience that looks cleaner, feels sharper, and
            keeps everyone more engaged.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-zinc-400">
                  Starter
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Free
                </h2>
                <p className="mt-4 max-w-md leading-7 text-zinc-400">
                  Best for trying Poolr, testing a concept with a small group, or running a
                  lighter casual pool.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                Beta access
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {starterFeatures.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-4 text-sm text-zinc-300"
                >
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <a
                href="/create-pool"
                className="inline-flex rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-medium text-white transition hover:bg-white/10"
              >
                Start Free
              </a>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-emerald-300/20 bg-gradient-to-b from-emerald-400/12 to-cyan-400/5 p-8 shadow-[0_30px_120px_rgba(16,185,129,0.08)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                  Commissioner Pro
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  $19.99
                </h2>
                <p className="mt-1 text-sm text-zinc-400">per pool</p>
                <p className="mt-4 max-w-md leading-7 text-zinc-300">
                  Built for serious groups that want a cleaner commissioner setup, stronger
                  pool presentation, and premium live competition energy.
                </p>
              </div>

              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                Recommended
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {proFeatures.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-[#0A0F1F]/70 px-4 py-4 text-sm text-zinc-200"
                >
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="/create-pool"
                className="inline-flex justify-center rounded-2xl bg-emerald-400 px-7 py-4 font-medium text-black shadow-[0_20px_60px_rgba(16,185,129,0.18)] transition hover:bg-emerald-300 hover:translate-y-[-1px]"
              >
                Go Pro
              </a>

              <a
                href="/live"
                className="inline-flex justify-center rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-medium text-white transition hover:bg-white/10"
              >
                View Live Demo
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
              Why premium works
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Premium should feel obviously better.
            </h3>
            <p className="mt-4 text-lg leading-8 text-zinc-400">
              The goal is not just to unlock more settings — it is to make the entire pool
              feel more serious, cleaner, and more exciting for everyone in it.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Better presentation",
                text: "Sharper pool pages, cleaner structure, and a more professional feeling experience.",
              },
              {
                title: "Stronger engagement",
                text: "Live leaderboard energy gives your group a reason to keep checking back all tournament.",
              },
              {
                title: "More commissioner control",
                text: "Run the pool your way with better rules, better lock logic, and better member management.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-white/10 bg-[#0A0F1F] p-5"
              >
                <div className="mb-4 h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.04]" />
                <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                <p className="mt-2 leading-7 text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
              Compare
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Free vs Commissioner Pro
            </h3>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/10 bg-[#0A0F1F]">
              <div className="px-5 py-4 text-sm text-zinc-500">Feature</div>
              <div className="px-5 py-4 text-sm font-medium text-zinc-300">Starter</div>
              <div className="px-5 py-4 text-sm font-medium text-emerald-300">Commissioner Pro</div>
            </div>

            {featureComparison.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/10 bg-white/[0.02] last:border-b-0"
              >
                <div className="px-5 py-4 text-sm text-zinc-300">{row.label}</div>
                <div className="px-5 py-4 text-sm text-zinc-500">{row.starter}</div>
                <div className="px-5 py-4 text-sm text-white">{row.pro}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-zinc-400">Best starting strategy</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Use free to get people in.
            </h3>
            <p className="mt-4 leading-7 text-zinc-400">
              Let smaller groups try Poolr first, get used to the flow, and see the value.
              That lowers friction and helps premium feel like an upgrade instead of a barrier.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-zinc-400">When premium makes sense</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              Charge when the experience earns it.
            </h3>
            <p className="mt-4 leading-7 text-zinc-400">
              Once the pool has real setup control, stronger live boards, cleaner invites,
              and better member management, $19.99 feels justified and premium.
            </p>
          </div>
        </div>

        <div className="mt-14 rounded-[2rem] border border-emerald-300/20 bg-gradient-to-r from-emerald-400/10 to-cyan-400/5 p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                Ready to launch
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Start with a better pool experience.
              </h3>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
                Build your next tournament pool with a setup that looks premium from the first invite.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
              <a
                href="/create-pool"
                className="rounded-2xl bg-emerald-400 px-7 py-4 text-center font-medium text-black transition hover:bg-emerald-300"
              >
                Create a Pool
              </a>
              <a
                href="/login"
                className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-center font-medium text-white transition hover:bg-white/10"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
import type { Metadata } from "next";
import PageWrapper from "../../components/PageWrapper";
import StripeCheckoutButton from "../../components/StripeCheckoutButton";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing | Poolr Golf Pool App",
  description:
    "Poolr pricing is simple: first premium golf pool free, single paid pools for $9.99, and monthly or annual options for serious pool creators.",
  path: "/pricing",
});

const plans = [
  {
    eyebrow: "Free First Pool",
    title: "Try Poolr",
    price: "$0",
    subline: "one lifetime premium pool",
    badge: "First one free",
    description:
      "Create your first premium tournament pool free. Same premium experience, no feature limits, no participant fees.",
    features: [
      "1 free premium pool per user",
      "Full pool creation",
      "Salary cap or tiered draft",
      "Hidden picks before lock",
      "Live leaderboard",
      "Creator pays $0, everyone joins free",
    ],
    href: "/create-pool",
    cta: "Create First Pool",
    featured: false,
    plan: null,
  },
  {
    eyebrow: "Single Pool",
    title: "Run one tournament",
    price: "$9.99",
    subline: "per pool",
    badge: "Core product",
    description:
      "The default Poolr purchase. Perfect when your group wants to run one clean, premium tournament pool.",
    features: [
      "1 premium tournament pool",
      "Unlimited invited participants",
      "Custom roster and scoring rules",
      "Invite code and share link",
      "Commissioner controls",
      "Everyone else joins free",
    ],
    href: "/create-pool?purchase=single",
    cta: "Buy Single Pool",
    featured: false,
    plan: "single" as const,
  },
  {
    eyebrow: "Monthly Pro",
    title: "Run unlimited pools",
    price: "$9.99",
    subline: "per month",
    badge: "Best for active groups",
    description:
      "For commissioners who run multiple pools. Unlimited premium pools for the same price as one pool.",
    features: [
      "Unlimited premium pools",
      "Pro badge",
      "Future priority features",
      "Best for repeat tournaments",
      "Cancel anytime",
      "Creator pays, groups join free",
    ],
    href: "/create-pool?purchase=monthly",
    cta: "Start Monthly Pro",
    featured: true,
    plan: "monthly" as const,
  },
];

const annualFeatures = [
  "Unlimited premium pools all year",
  "Best value for serious commissioners",
  "Pro badge and future premium perks",
  "Great for golf groups that run every major and more",
];

const includedFeatures = [
  {
    title: "Premium pool creation",
    text: "Create clean, high-quality golf pools built around real tournaments, custom formats, and simple invites.",
  },
  {
    title: "Creator pays",
    text: "Only the pool creator pays. Participants join free, build teams, and follow the leaderboard without friction.",
  },
  {
    title: "Hidden picks before lock",
    text: "Keep teams hidden until the tournament locks so every group gets a fair, competitive pool.",
  },
  {
    title: "Live leaderboard",
    text: "Give the group a reason to keep checking back all tournament with a premium live board experience.",
  },
  {
    title: "Salary cap or tiered draft",
    text: "Run the format that fits your group: salary cap strategy or a clean one-pick-per-tier draft.",
  },
  {
    title: "Commissioner controls",
    text: "Manage pool settings, members, invite links, lock state, payouts, and team visibility from one place.",
  },
];

const modelRules = [
  "First Poolr experience is free",
  "Every additional single pool is $9.99",
  "Monthly Pro is $9.99/month for unlimited premium pools",
  "Annual Pro is $59.99/year for unlimited premium pools",
  "Creator pays; everyone else joins free",
  "No per-user fees, no rake, no percentage of winnings",
];

const primaryButtonClass =
  "inline-flex w-full justify-center rounded-2xl bg-emerald-400 px-7 py-4 font-black text-black shadow-[0_20px_60px_rgba(16,185,129,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60";

const ghostButtonClass =
  "inline-flex w-full justify-center rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

export default function PricingPage() {
  return (
    <PageWrapper>
      <section className="relative mx-auto max-w-7xl px-8 py-14 md:px-12 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Creator pays. Everyone else plays free.
          </div>

          <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            Simple pricing for
            <br />
            premium golf pools.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400 md:text-xl">
            Poolr sells the pool itself, not access to the app. Your first premium
            pool is free. After that, run one pool for $9.99 or go unlimited with Pro.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.title}
              className={[
                "relative overflow-hidden rounded-[2.25rem] border p-8 shadow-[0_25px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl",
                plan.featured
                  ? "border-emerald-300/25 bg-gradient-to-b from-emerald-400/14 to-cyan-400/5"
                  : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={[
                      "text-sm uppercase tracking-[0.25em]",
                      plan.featured ? "text-emerald-300/90" : "text-zinc-400",
                    ].join(" ")}
                  >
                    {plan.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {plan.title}
                  </h2>
                </div>

                <div
                  className={[
                    "rounded-full border px-3 py-1 text-xs",
                    plan.featured
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-zinc-300",
                  ].join(" ")}
                >
                  {plan.badge}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-5xl font-semibold tracking-tight text-white">
                  {plan.price}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{plan.subline}</p>
              </div>

              <p className="mt-6 min-h-[84px] leading-7 text-zinc-400">
                {plan.description}
              </p>

              <div className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-[#0A0F1F]/75 px-4 py-4 text-sm text-zinc-300"
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                {plan.plan ? (
                  <StripeCheckoutButton
                    plan={plan.plan}
                    className={plan.featured ? primaryButtonClass : ghostButtonClass}
                  >
                    {plan.cta}
                  </StripeCheckoutButton>
                ) : (
                  <a href={plan.href} className={ghostButtonClass}>
                    {plan.cta}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[2.25rem] border border-emerald-300/20 bg-gradient-to-r from-emerald-400/12 to-cyan-400/5 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.22)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                Annual Pro
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                $59.99/year
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Displayed as <span className="line-through">$99</span> → $59.99
              </p>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
                Best value for serious groups and repeat commissioners who want
                unlimited premium pools all year.
              </p>
              <div className="mt-7">
                <StripeCheckoutButton
                  plan="annual"
                  className="inline-flex rounded-2xl bg-white px-7 py-4 font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Start Annual Pro
                </StripeCheckoutButton>
              </div>
            </div>

            <div className="space-y-3">
              {annualFeatures.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-[#0A0F1F]/75 px-4 py-4 text-sm text-zinc-200"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
              Included in every premium pool
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              No feature-limited starter pool.
            </h3>
            <p className="mt-4 text-lg leading-8 text-zinc-400">
              The first pool is free because we want people to experience the real product.
              Every Poolr pool should feel premium from the first invite.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {includedFeatures.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-white/10 bg-[#0A0F1F] p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-sm font-black text-emerald-300">
                  P
                </div>
                <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                <p className="mt-2 leading-7 text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
              The model
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              One buyer, zero friction for the group.
            </h3>
            <p className="mt-4 leading-7 text-zinc-400">
              Poolr grows because participants can join free. The creator pays
              for the premium pool experience, and every pool introduces more
              people to Poolr.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
            <div className="grid gap-3 sm:grid-cols-2">
              {modelRules.map((rule) => (
                <div
                  key={rule}
                  className="rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-4 text-sm text-zinc-300"
                >
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[2rem] border border-emerald-300/20 bg-gradient-to-r from-emerald-400/10 to-cyan-400/5 p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                Ready to run it
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Your first premium pool is free.
              </h3>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
                Create the pool, invite your group, and let the product prove itself.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
              <a
                href="/create-pool"
                className="rounded-2xl bg-emerald-400 px-7 py-4 text-center font-black text-black transition hover:bg-emerald-300"
              >
                Create First Pool
              </a>
              <a
                href="/account"
                className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-center font-black text-white transition hover:bg-white/10"
              >
                Account Center
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}

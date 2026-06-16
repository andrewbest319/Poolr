import type { Metadata } from "next";
import Link from "next/link";
import {
  homeDescription,
  homeTitle,
  jsonLd,
  organizationJsonLd,
  pageMetadata,
  softwareApplicationJsonLd,
} from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(softwareApplicationJsonLd) }}
      />
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_35%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 sm:pb-20 sm:pt-24 lg:px-8 lg:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Built for premium golf pools
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                The easiest way to run a golf pool with friends
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
                Create a golf pool. Invite your group. Build teams. Track the leaderboard live.
                Poolr gives PGA tournament pools custom rules, hidden picks, salary cap or tiered
                formats, and a cleaner experience than spreadsheets and group chats.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/create-pool"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                  Create a Pool
                </Link>

                <Link
                  href="/join-pool"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Join with Code
                </Link>
              </div>

              <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
                <QuickStat value="First Pool Free" label="creator pays" />
                <QuickStat value="Tiered Draft" label="or Salary Cap" />
                <QuickStat value="Invite Code" label="friends join free" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[36px] bg-emerald-500/10 blur-3xl" />
              <div className="relative rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40 backdrop-blur">
                <div className="rounded-[26px] border border-white/10 bg-neutral-900 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        Featured Pool
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">Masters Weekend Money Pool</h2>
                    </div>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Live
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <InfoCard label="Format" value="Salary Cap" />
                    <InfoCard label="Entry Fee" value="$25" />
                    <InfoCard label="Roster Size" value="6 Golfers" />
                    <InfoCard label="Counted" value="Top 3 Scores" />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                          Invite Code
                        </p>
                        <p className="mt-2 text-2xl font-bold tracking-[0.28em] text-white">
                          A7K9Q2
                        </p>
                      </div>
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                        Private Pool
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <LiveRow
                      name="Fairway Killers"
                      detail="Top lineup today"
                      points="412 pts"
                    />
                    <LiveRow
                      name="Green Jacket Unit"
                      detail="2 golfers inside top 10"
                      points="398 pts"
                    />
                    <LiveRow
                      name="Sunday Chasers"
                      detail="Bonus points active"
                      points="387 pts"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Run it your way"
            text="Set roster size, counted golfers, scoring bonuses, visibility rules, and the format your group wants."
          />
          <FeatureCard
            title="Make it feel premium"
            text="Private invite codes, sharper design, cleaner structure, and a format people actually want to use."
          />
          <FeatureCard
            title="Clear for the group"
            text="The creator pays, everyone else joins free, and the first premium pool is free to try."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/5 p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Why people will choose Poolr
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                It fixes everything that usually makes pools feel sloppy.
              </h2>
              <p className="mt-4 max-w-xl text-neutral-300">
                Most pools are run through texts, spreadsheets, scattered payments, and rules that
                no one can remember. Poolr makes the whole thing feel organized, competitive, and
                worth getting excited about.
              </p>

              <div className="mt-6 space-y-3">
                <BenefitRow text="Cleaner than spreadsheets" />
                <BenefitRow text="Better than random group chat updates" />
                <BenefitRow text="Easy for casual users, deep enough for serious players" />
                <BenefitRow text="Designed to feel like a real premium platform" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MiniPanel
                title="Tiered Draft"
                text="Simple, clean, and easy for any group to understand."
              />
              <MiniPanel
                title="Salary Cap"
                text="More strategy, more edge, and a stronger competitive feel."
              />
              <MiniPanel
                title="Custom Scoring"
                text="Use counted-player rules, bonuses, and pool-specific settings."
              />
              <MiniPanel
                title="Fast Invite Flow"
                text="Create a pool, share the code, and fill it quickly."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <BigNumberCard number="4, 6, 8, 10" label="roster sizes supported" />
          <BigNumberCard number="2 formats" label="tiered draft or salary cap" />
          <BigNumberCard number="1 clean code" label="simple private pool entry" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Explore Poolr
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["/golf-pools", "Golf Pools"],
              ["/pga-golf-pool", "PGA Golf Pool"],
              ["/fantasy-golf-pool", "Fantasy Golf Pool"],
              ["/salary-cap-golf-pool", "Salary Cap"],
              ["/tiered-golf-pool", "Tiered Format"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 lg:px-8">
        <div className="rounded-[34px] border border-emerald-500/20 bg-emerald-500/10 p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Start now
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Set the rules. Share the code. Make the tournament matter more.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-300 sm:text-base">
            Poolr is built to make golf pools feel sharper, more competitive, and more worth
            talking about all weekend long.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/create-pool"
              className="rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              Create a Pool
            </Link>
            <Link
              href="/join-pool"
              className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Join a Pool
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function QuickStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LiveRow({
  name,
  detail,
  points,
}: {
  name: string;
  detail: string;
  points: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="mt-1 text-xs text-neutral-500">{detail}</p>
      </div>
      <p className="text-sm font-semibold text-emerald-300">{points}</p>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{text}</p>
    </div>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
      <p className="text-sm text-neutral-200">{text}</p>
    </div>
  );
}

function MiniPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{text}</p>
    </div>
  );
}

function BigNumberCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
      <p className="text-3xl font-bold tracking-tight text-white">{number}</p>
      <p className="mt-2 text-sm uppercase tracking-[0.18em] text-neutral-500">{label}</p>
    </div>
  );
}
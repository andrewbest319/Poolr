import PageWrapper from "../../components/PageWrapper";

const poolStandings = [
  ["#1", "AJ", "-14", "+2 today"],
  ["#2", "Mason", "-12", "+1 today"],
  ["#3", "Evan", "-11", "-1 today"],
  ["#4", "Luke", "-10", "+3 today"],
];

const playerBoard = [
  ["Scheffler", "-8", "Thru 16"],
  ["Åberg", "-6", "Thru 14"],
  ["Morikawa", "-5", "Thru 17"],
  ["Hovland", "-4", "Thru 13"],
];

const callouts = [
  "Live pool standings",
  "Golfer movement throughout the day",
  "Premium scoreboard design",
  "Built for tournament energy",
];

export default function LivePage() {
  return (
    <PageWrapper>
      <section className="relative mx-auto max-w-7xl px-8 py-14 md:px-12 md:py-16">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live leaderboard mode
          </div>

          <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            The scoreboard
            <br />
            should feel as live
            <br />
            as the tournament.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400 md:text-xl">
            Poolr’s live board is built to create tension, momentum, and a cleaner premium
            pool experience while the tournament unfolds.
          </p>
        </div>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-sm text-zinc-400">Weekend Championship Club</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  Pool Standings
                </h2>
              </div>

              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                Refreshing live
              </div>
            </div>

            <div className="space-y-3">
              {poolStandings.map(([rank, name, score, detail]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-zinc-300">
                      {rank}
                    </div>
                    <div>
                      <div className="font-medium text-white">{name}</div>
                      <div className="text-sm text-zinc-400">{detail}</div>
                    </div>
                  </div>

                  <div className="text-xl font-semibold tracking-tight text-white">
                    {score}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#0A0F1F] p-4">
                <div className="text-sm text-zinc-400">Pool Pot</div>
                <div className="mt-2 text-3xl font-semibold text-white">$1,280</div>
                <div className="mt-2 text-xs text-zinc-500">64 entries</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0A0F1F] p-4">
                <div className="text-sm text-zinc-400">Status</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">Live</div>
                <div className="mt-2 text-xs text-zinc-500">Round in progress</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-emerald-300/20 bg-gradient-to-b from-emerald-400/12 to-cyan-400/5 p-6 shadow-[0_20px_80px_rgba(16,185,129,0.08)]">
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                Tournament board
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                Top golfers right now
              </h3>

              <div className="mt-5 space-y-3">
                {playerBoard.map(([name, score, detail]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0A0F1F]/70 px-4 py-4"
                  >
                    <div>
                      <div className="font-medium text-white">{name}</div>
                      <div className="text-sm text-zinc-400">{detail}</div>
                    </div>

                    <div className="text-xl font-semibold text-emerald-300">{score}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm text-zinc-400">Why it matters</p>
              <div className="mt-4 space-y-3">
                {callouts.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-4 text-zinc-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm text-zinc-400">Future premium layer</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0A0F1F] p-4">
                  <div className="font-medium text-white">Momentum notifications</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-400">
                    “Cameron Young is heating up for your team 🔥 See where you stand.”
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0A0F1F] p-4">
                  <div className="font-medium text-white">Visual heat indicators</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-400">
                    Hot players, top-10 bonus movement, and scoreboard momentum built into the UI.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
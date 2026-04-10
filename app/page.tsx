import PageWrapper from "./components/PageWrapper";
export default function Home() {
  return (
    <PageWrapper>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-8 py-20 md:px-12 lg:grid-cols-2 lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Private pools, premium experience
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] md:text-7xl">
            Build brackets.
            <br />
            Compete.
            <br />
            Win pools.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            Create private pools with friends, track live leaderboards, and run a clean,
            high-end experience across golf and beyond.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="/login"
              className="rounded-2xl bg-white px-7 py-4 font-medium text-black hover:scale-[1.02] transition text-center"
            >
              Start a Pool
            </a>
            <a
              href="/live"
              className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-medium text-white hover:bg-white/10 transition text-center"
            >
              View Demo
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            {[
              { value: "60 sec", label: "to create a pool" },
              { value: "Live", label: "scoring updates" },
              { value: "Private", label: "invite-only groups" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="text-2xl font-semibold">{item.value}</div>
                <div className="mt-1 text-sm text-zinc-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-white/5 blur-2xl" />

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl shadow-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0A0F1F] p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-zinc-400">Featured Pool</p>
                  <h3 className="mt-1 text-xl font-semibold">Weekend Championship Club</h3>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  Live
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ["#1", "AJ", "-14", "+2 today"],
                  ["#2", "Mason", "-12", "+1 today"],
                  ["#3", "Evan", "-11", "-1 today"],
                  ["#4", "Luke", "-10", "+3 today"],
                ].map(([rank, name, score, detail]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-zinc-300">
                        {rank}
                      </div>
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-zinc-400">{detail}</div>
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-white">{score}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-zinc-400">Pool Pot</div>
                  <div className="mt-2 text-3xl font-semibold">$1,280</div>
                  <div className="mt-2 text-xs text-zinc-500">64 entries</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-zinc-400">Top Golfer</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-300">-8</div>
                  <div className="mt-2 text-xs text-zinc-500">Scheffler • thru 16</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 pb-24 md:px-12">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
            Why Poolr
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Everything built to feel premium.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Clean design, live competition, and smooth commissioner controls for serious private pools.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Private pool creation",
              desc: "Create polished invite-only pools in under a minute with clean setup and easy sharing.",
            },
            {
              title: "Live scoreboards",
              desc: "Track movement in real time with strong visual hierarchy and sharp leaderboard cards.",
            },
            {
              title: "Built to expand",
              desc: "Start with golf, then grow into March Madness, football playoffs, and more formats.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-7 hover:border-white/20 transition"
            >
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 leading-7 text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PageWrapper>
  );
}
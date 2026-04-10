import PageWrapper from "../components/PageWrapper";
export default function LivePage() {
  return (
    <PageWrapper>
      <section className="mx-auto max-w-6xl px-8 py-16 md:px-12">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
          Live Scoreboards
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          A live board that keeps everyone locked in.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Sharp, clean standings for both pool members and players.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-zinc-400">Weekend Championship Club</p>
                <h2 className="mt-1 text-2xl font-semibold">Pool Standings</h2>
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
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-4"
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
                  <div className="text-xl font-semibold">{score}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="border-b border-white/10 pb-4">
              <p className="text-sm text-zinc-400">Top Players</p>
              <h2 className="mt-1 text-2xl font-semibold">Tournament Board</h2>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Scheffler", "-8", "thru 16"],
                ["Åberg", "-6", "thru 14"],
                ["Morikawa", "-5", "thru 17"],
                ["Hovland", "-4", "thru 13"],
              ].map(([name, score, detail]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-4"
                >
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-zinc-400">{detail}</div>
                  </div>
                  <div className="text-xl font-semibold text-emerald-300">{score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
import PageWrapper from "../components/PageWrapper";
export default function PricingPage() {
  return (
    <PageWrapper>
      <section className="mx-auto max-w-6xl px-8 py-16 md:px-12">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
          Pricing
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Simple to start. Premium when you want more.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Start free for casual groups, then unlock a more premium commissioner experience.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <div className="text-sm text-zinc-400">Starter</div>
            <div className="mt-3 text-5xl font-semibold">Free</div>
            <p className="mt-4 text-zinc-400">For casual groups getting their first pool running.</p>
            <div className="mt-8 space-y-3 text-zinc-300">
              <div>• Private pool creation</div>
              <div>• Invite friends</div>
              <div>• Standard leaderboard</div>
              <div>• Basic rules</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-300/20 bg-gradient-to-b from-emerald-400/10 to-cyan-400/5 p-8">
            <div className="text-sm text-zinc-300">Commissioner Pro</div>
            <div className="mt-3 text-5xl font-semibold">$9</div>
            <p className="mt-4 text-zinc-300">For serious groups that want stronger control and a premium look.</p>
            <div className="mt-8 space-y-3 text-zinc-200">
              <div>• Advanced commissioner controls</div>
              <div>• Enhanced live scoreboards</div>
              <div>• Premium pool history</div>
              <div>• Better stats and visuals</div>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
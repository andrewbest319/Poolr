import PageWrapper from "../../components/PageWrapper";

const steps = [
  {
    step: "01",
    title: "Create the pool",
    text: "The commissioner sets the format, entry structure, roster rules, scoring count, and lock time.",
  },
  {
    step: "02",
    title: "Invite the group",
    text: "Share a clean private invite link and code so members can join without any confusion.",
  },
  {
    step: "03",
    title: "Build the rosters",
    text: "Members create lineups using salary cap or tiered draft rules before the pool locks.",
  },
  {
    step: "04",
    title: "Compete live",
    text: "Watch standings shift as the tournament plays out with premium leaderboard energy.",
  },
];

export default function HowPage() {
  return (
    <PageWrapper>
      <section className="relative mx-auto max-w-7xl px-8 py-14 md:px-12 md:py-16">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            How it works
          </div>

          <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            A better flow
            <br />
            for better pools.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400 md:text-xl">
            Poolr turns pool setup, invites, picks, and live competition into a cleaner product
            experience that feels more serious from the start.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {steps.map((item) => (
            <div
              key={item.step}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                Step {item.step}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {item.title}
              </h2>
              <p className="mt-4 leading-7 text-zinc-400">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
            Product mindset
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Built for commissioners first.
          </h3>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-400">
            The person running the pool drives the whole experience. Poolr is built to make
            them look organized, premium, and in control — while still keeping the member flow clean.
          </p>
        </div>
      </section>
    </PageWrapper>
  );
}
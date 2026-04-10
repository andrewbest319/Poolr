import PageWrapper from "../components/PageWrapper";
export default function HowPage() {
  return (
    <PageWrapper>
      <section className="mx-auto max-w-5xl px-8 py-16 md:px-12">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
          How It Works
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Running a pool should feel simple.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Poolr makes it easy to create a private competition, invite your group,
          lock in picks, and follow the standings live.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            ["01", "Create your pool", "Choose your event, set rules, and launch a polished private pool in minutes."],
            ["02", "Invite your group", "Send one clean invite link so friends can join fast without any spreadsheet chaos."],
            ["03", "Lock in picks", "Members submit their picks before the event starts while everything stays organized."],
            ["04", "Track it live", "Watch live score movement and standings shift throughout the tournament."],
          ].map(([step, title, desc]) => (
            <div key={step} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-7">
              <div className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">{step}</div>
              <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PageWrapper>
  );
}
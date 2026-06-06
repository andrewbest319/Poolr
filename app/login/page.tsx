import PageWrapper from "../../components/PageWrapper";

const loginBenefits = [
  "Create and manage private pools",
  "Save lineups before lock",
  "Track standings and live movement",
  "Get invited into premium pools fast",
];

export default function LoginPage() {
  return (
    <PageWrapper>
      <section className="relative mx-auto max-w-7xl px-8 py-14 md:px-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Welcome to Poolr
            </div>

            <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
              Sign in to your
              <br />
              pools, picks,
              <br />
              and competition.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
              Access your private pools, manage your rosters, follow live standings,
              and keep your tournament action organized in one premium place.
            </p>

            <div className="mt-8 grid gap-3 max-w-xl">
              {loginBenefits.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-zinc-300"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 max-w-xl">
              <div className="text-sm text-zinc-400">Brand voice</div>
              <div className="mt-2 text-lg font-semibold text-white">
                “Welcome to Poolr — where your predictions turn into teams.”
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                This can later power welcome emails, event reminders, promo texts, and onboarding.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-b from-emerald-400/15 via-cyan-400/10 to-transparent blur-3xl" />

            <div className="relative rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0A0F1F] p-8">
                <div className="mb-8">
                  <div className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
                    Sign In
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Access your account
                  </h2>
                  <p className="mt-2 text-zinc-400">
                    Use email or phone to continue into your pools.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">Email or phone</label>
                    <input
                      type="text"
                      placeholder="name@email.com or (555) 555-5555"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none placeholder:text-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none placeholder:text-zinc-500"
                    />
                  </div>

                  <button className="w-full rounded-2xl bg-emerald-400 px-6 py-4 font-medium text-black shadow-[0_20px_60px_rgba(16,185,129,0.18)] transition hover:bg-emerald-300">
                    Continue
                  </button>

                  <button className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-medium text-white transition hover:bg-white/10">
                    Continue with Google
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <button className="rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
                      Text me a code
                    </button>
                    <button className="rounded-2xl border border-white/10 bg-[#0A0F1F] px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]">
                      Forgot password
                    </button>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm text-zinc-400">Future growth layer</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Later, this flow can support welcome emails, tournament reminders,
                    promo texts, and re-engagement campaigns before major events.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
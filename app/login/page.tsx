import PageWrapper from "../components/PageWrapper";
export default function LoginPage() {
  return (
    <PageWrapper>
      <section className="mx-auto max-w-5xl px-8 py-16 md:px-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/80">
              Login
            </p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight">
              Welcome back to your pools.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              Sign in to manage pools, track standings, and keep your group competition running smoothly.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-8">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-2 text-zinc-400">Access your groups, picks, and live scoreboards.</p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Email</label>
                <input
                  type="email"
                  placeholder="name@email.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-500"
                />
              </div>

              <button className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0A0E14] hover:bg-zinc-100 transition">
                Continue
              </button>

              <button className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium hover:bg-white/10 transition">
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
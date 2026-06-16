import Link from "next/link";
import Navbar from "./Navbar";
import { faqJsonLd, jsonLd, type LandingPage } from "../lib/seo";

export default function SeoLandingPage({ page }: { page: LandingPage }) {
  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd(page.faqs)) }}
      />

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_88%_6%,rgba(56,189,248,0.10),transparent_28%),linear-gradient(to_bottom,#030712,#07111f_48%,#030712)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 lg:px-8 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                {page.eyebrow}
              </p>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                {page.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                {page.intro}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {page.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-slate-100"
                  >
                    {bullet}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/create-pool"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                >
                  Start Free
                </Link>
                <Link
                  href="/join-pool"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Join a Pool
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Poolr flow
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                Create a golf pool. Invite your group. Build teams. Track the leaderboard live.
              </h2>

              <div className="mt-6 space-y-3">
                {[
                  ["1", "Create", "Choose the tournament, format, roster, and scoring rules."],
                  ["2", "Invite", "Share one private link or code with the group."],
                  ["3", "Build", "Friends create teams before picks lock."],
                  ["4", "Follow", "Standings and live scoring keep the weekend moving."],
                ].map(([step, title, text]) => (
                  <div
                    key={step}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-black">
                      {step}
                    </div>
                    <div>
                      <h3 className="font-black text-white">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
                <p className="text-sm font-bold text-emerald-100">
                  The creator pays. Everyone else joins free. First premium pool is free.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {page.sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.2)]"
            >
              <h2 className="text-2xl font-black tracking-tight text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Details
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              {page.featureTitle}
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {page.features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <h3 className="text-lg font-black text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Common questions
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Helpful answers for commissioners and players before they create or join a Poolr golf pool.
            </p>
          </div>

          <dl className="space-y-3">
            {page.faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <dt className="font-black text-white">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-400">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-emerald-300/20 bg-emerald-300/[0.08] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Ready to run it
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Start with your first premium pool free.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Create the pool, invite your group, and keep the whole tournament weekend in one clean place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/create-pool"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Create a Pool
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-black/25 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-5">
            {page.related.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

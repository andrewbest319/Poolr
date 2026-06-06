"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type PoolrUser = {
  id: string;
  full_name: string;
  email: string;
  email_normalized: string;
  phone: string;
  phone_normalized: string;
  has_used_free_pool_experience: boolean;
marketing_email_opt_in: true,  marketing_sms_opt_in: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function AccountPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get("returnTo") || "/create-pool";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadExistingUser() {
      try {
        const savedUserId =
          typeof window !== "undefined"
            ? localStorage.getItem("poolr_user_id")
            : null;

        if (!savedUserId) return;

        const { data, error } = await supabase
          .from("poolr_users")
          .select("*")
          .eq("id", savedUserId)
          .maybeSingle();

        if (error) throw new Error(error.message);

        if (data) {
          const user = data as PoolrUser;

          setFullName(user.full_name || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
          setEmailOptIn(user.marketing_email_opt_in ?? true);
          setSmsOptIn(user.marketing_sms_opt_in ?? true);
        }
      } catch (err) {
        console.warn("Could not load saved Poolr account:", err);
      } finally {
        setLoadingExisting(false);
      }
    }

    loadExistingUser();
  }, []);

  async function saveAccount() {
    setError("");

    const cleanedName = fullName.trim();
    const cleanedEmail = email.trim();
    const cleanedPhone = phone.trim();

    const emailNormalized = normalizeEmail(cleanedEmail);
    const phoneNormalized = normalizePhone(cleanedPhone);

    if (!cleanedName) {
      setError("Enter your full name.");
      return;
    }

    if (!emailNormalized || !emailNormalized.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (phoneNormalized.length < 10) {
      setError("Enter a valid phone number.");
      return;
    }

    setSaving(true);

    try {
      const emailLookup = await supabase
        .from("poolr_users")
        .select("*")
        .eq("email_normalized", emailNormalized)
        .maybeSingle();

      if (emailLookup.error) throw new Error(emailLookup.error.message);

      const phoneLookup = await supabase
        .from("poolr_users")
        .select("*")
        .eq("phone_normalized", phoneNormalized)
        .maybeSingle();

      if (phoneLookup.error) throw new Error(phoneLookup.error.message);

      const emailUser = emailLookup.data as PoolrUser | null;
      const phoneUser = phoneLookup.data as PoolrUser | null;

      if (emailUser && phoneUser && emailUser.id !== phoneUser.id) {
        setError(
          "That email and phone number are attached to different Poolr accounts. Use the same email and phone number you used before."
        );
        setSaving(false);
        return;
      }

      const existingUser = emailUser || phoneUser;
      let savedUser: PoolrUser | null = null;

      if (existingUser) {
        const { data, error } = await supabase
          .from("poolr_users")
          .update({
            full_name: cleanedName,
            email: cleanedEmail,
            email_normalized: emailNormalized,
            phone: cleanedPhone,
            phone_normalized: phoneNormalized,
            marketing_email_opt_in: emailOptIn,
            marketing_sms_opt_in: smsOptIn,
          })
          .eq("id", existingUser.id)
          .select("*")
          .single();

        if (error) throw new Error(error.message);

        savedUser = data as PoolrUser;
      } else {
        const { data, error } = await supabase
          .from("poolr_users")
          .insert({
            full_name: cleanedName,
            email: cleanedEmail,
            email_normalized: emailNormalized,
            phone: cleanedPhone,
            phone_normalized: phoneNormalized,
            marketing_email_opt_in: emailOptIn,
            marketing_sms_opt_in: smsOptIn,
            has_used_free_pool_experience: false,
          })
          .select("*")
          .single();

        if (error) throw new Error(error.message);

        savedUser = data as PoolrUser;
      }

      if (!savedUser) throw new Error("Could not save account.");

      localStorage.setItem("poolr_user_id", savedUser.id);
      localStorage.setItem("poolr_user_name", savedUser.full_name);
      localStorage.setItem("poolr_user_email", savedUser.email);
      localStorage.setItem("poolr_user_phone", savedUser.phone);

      router.push(returnTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving your account."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-[-12%] top-[8%] h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[36px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Account
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Create your Poolr account.
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-400">
              Save your teams, join pools faster, and keep your Poolr experience connected across tournaments.
            </p>

            <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
              <p className="text-sm font-black text-emerald-200">
                Start with Poolr today.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your account connects the pools you create, the teams you join, and the tournaments you play with your group.
              </p>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm font-black text-white">Stay connected</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                We’ll save your contact details so Poolr can send pool updates, tournament reminders, and follow-ups about your experience.
              </p>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm font-black text-white">Built for groups</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Create a pool, invite your friends, build your team, and follow the leaderboard live during the tournament.
              </p>
            </div>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Back Home
            </Link>
          </section>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                  Account Details
                </p>
                <h2 className="mt-2 text-3xl font-black">Continue to Poolr</h2>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                Required
              </span>
            </div>

            {loadingExisting ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-slate-400">
                Checking for saved account...
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-black text-white">Full Name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="AJ Best"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-white">Email</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@email.com"
                    type="email"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-white">Phone Number</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="(555) 555-5555"
                    type="tel"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setSmsOptIn((prev) => !prev)}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-black text-white">
                      Text message updates and offers
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Get occasional Poolr texts about your pools, tournament reminders, product updates, and offers. Message and data rates may apply. You can turn this off before continuing.
                    </p>
                  </div>

                  <span
                    className={cn(
                      "relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
                      smsOptIn ? "bg-emerald-400" : "bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 rounded-full bg-white transition",
                        smsOptIn ? "translate-x-5" : "translate-x-1"
                      )}
                    />
                  </span>
                </button>

                {error && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">
                    {error}
                  </div>
                )}

                <button
                  onClick={saveAccount}
                  disabled={saving}
                  className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving Account..." : "Continue"}
                </button>

                <p className="text-center text-xs leading-5 text-slate-500">
                  Your account is saved securely in Poolr and connected to your future pools and teams.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#040816] p-8 text-white">
          Loading account...
        </main>
      }
    >
      <AccountPageInner />
    </Suspense>
  );
}
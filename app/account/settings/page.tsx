"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PoolrUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  email_normalized?: string | null;
  phone: string | null;
  phone_normalized?: string | null;
  has_used_free_pool_experience?: boolean | null;
  marketing_email_opt_in?: boolean | null;
  marketing_sms_opt_in?: boolean | null;
  stripe_customer_id?: string | null;
  poolr_plan?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  pro_active_until?: string | null;
  single_pool_credits?: number | string | null;
  last_paid_at?: string | null;
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

function safeReturnPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value === "/account/settings" || value === "/login") return null;
  return value;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSinglePoolCredits(user: PoolrUser | null) {
  if (!user) return 0;
  const credits = Number(user.single_pool_credits ?? 0);
  return Number.isFinite(credits) ? Math.max(0, credits) : 0;
}

function hasActiveProAccess(user: PoolrUser | null) {
  if (!user) return false;

  const plan = String(user.poolr_plan ?? "").toLowerCase();
  const status = String(user.stripe_subscription_status ?? "").toLowerCase();
  const proUntil = user.pro_active_until
    ? new Date(user.pro_active_until).getTime()
    : 0;

  const planLooksPro =
    plan.includes("monthly_pro") ||
    plan.includes("annual_pro") ||
    plan.includes("pro");

  const statusLooksActive =
    status === "active" || status === "trialing" || status === "paid";

  const dateStillActive = Number.isFinite(proUntil) && proUntil > Date.now();

  return (planLooksPro && (statusLooksActive || dateStillActive)) || dateStillActive;
}

function getPlanLabel(user: PoolrUser | null) {
  if (!user) return "Not signed in";

  const plan = String(user.poolr_plan ?? "free").toLowerCase();
  const credits = getSinglePoolCredits(user);

  if (hasActiveProAccess(user)) {
    if (plan.includes("annual")) return "Annual Pro";
    if (plan.includes("monthly")) return "Monthly Pro";
    return "Pro Access";
  }

  if (credits > 0) return "Single Pool Credit";
  if (user.has_used_free_pool_experience) return "Free Used";
  return "Free First Pool";
}

function ButtonLink({
  href,
  children,
  variant = "ghost",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "white" | "ghost" | "dark";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition",
        variant === "primary" && "bg-emerald-400 text-black hover:bg-emerald-300",
        variant === "white" && "bg-white text-slate-950 hover:bg-slate-200",
        variant === "dark" && "border border-white/10 bg-black/25 text-white hover:bg-white/10",
        variant === "ghost" && "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      )}
    >
      {children}
    </Link>
  );
}

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] shadow-[0_28px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("returnTo")),
    [searchParams]
  );

  const [account, setAccount] = useState<PoolrUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const hydrateUser = useCallback((user: PoolrUser) => {
    setAccount(user);
    setFullName(user.full_name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setEmailOptIn(user.marketing_email_opt_in ?? true);
    setSmsOptIn(user.marketing_sms_opt_in ?? true);

    if (typeof window !== "undefined") {
      localStorage.setItem("poolr_user_id", user.id);
      localStorage.setItem("poolr_user_name", user.full_name || "");
      localStorage.setItem("poolr_user_email", user.email || "");
      localStorage.setItem("poolr_user_phone", user.phone || "");
    }
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const savedUserId =
          typeof window !== "undefined"
            ? localStorage.getItem("poolr_user_id")
            : null;

        if (!savedUserId) {
          setLoading(false);
          return;
        }

        const { data, error: userError } = await supabase
          .from("poolr_users")
          .select("*")
          .eq("id", savedUserId)
          .maybeSingle();

        if (userError) throw new Error(userError.message);

        if (data) hydrateUser(data as PoolrUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load account.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [hydrateUser]);

  async function saveAccount() {
    setError("");
    setNotice("");

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

      const existingUser = emailUser || phoneUser || account;
      let savedUser: PoolrUser | null = null;

      if (existingUser) {
        const { data, error: updateError } = await supabase
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

        if (updateError) throw new Error(updateError.message);

        savedUser = data as PoolrUser;
      } else {
        const { data, error: insertError } = await supabase
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
            poolr_plan: "free",
            single_pool_credits: 0,
          })
          .select("*")
          .single();

        if (insertError) throw new Error(insertError.message);

        savedUser = data as PoolrUser;
      }

      if (!savedUser) throw new Error("Could not save account.");

      hydrateUser(savedUser);

      if (returnTo) {
        router.push(returnTo);
        return;
      }

      setNotice("Account information saved.");
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

  async function openBillingPortal() {
    if (!account?.id) {
      setError("Create or find your account before managing billing.");
      return;
    }

    setBillingLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolrUserId: account.id }),
      });

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(result?.error || "Could not open billing portal.");
      }

      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
    } finally {
      setBillingLoading(false);
    }
  }

  function signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("poolr_user_id");
      localStorage.removeItem("poolr_user_name");
      localStorage.removeItem("poolr_user_email");
      localStorage.removeItem("poolr_user_phone");
    }

    setAccount(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setNotice("Signed out locally.");
  }

  const planLabel = getPlanLabel(account);
  const credits = getSinglePoolCredits(account);
  const hasBillingProfile = Boolean(
    account?.stripe_customer_id || account?.stripe_subscription_id
  );

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-[560px] w-[560px] rounded-full bg-emerald-500/16 blur-3xl" />
        <div className="absolute right-[-10%] top-[2%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,7,18,0.25),rgba(3,7,18,0.96))]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.78),rgba(2,6,23,0.9))] p-6 shadow-[0_38px_140px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
                Account Information
              </p>
              <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] sm:text-6xl">
                Profile & Billing.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Keep the main Account Center clean. Manage your profile, plan, credits, and cancellation here.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/account" variant="primary">
                Account Center
              </ButtonLink>
              <ButtonLink href="/pricing" variant="ghost">
                Pricing
              </ButtonLink>
              {account ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Use Different Account
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {notice ? (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card
            title={account ? "Profile Details" : "Create / Find Account"}
            subtitle={returnTo ? "Save this first, then Poolr will take you back." : "Name, email, phone, and communication preferences."}
          >
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-slate-400">
                Checking for saved account...
              </div>
            ) : (
              <div className="space-y-5">
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
                  onClick={() => setEmailOptIn((prev) => !prev)}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-black text-white">Email updates</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Pool reminders, product updates, and offers.
                    </p>
                  </div>

                  <span className={cn("relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition", emailOptIn ? "bg-emerald-400" : "bg-white/10")}>
                    <span className={cn("inline-block h-5 w-5 rounded-full bg-white transition", emailOptIn ? "translate-x-5" : "translate-x-1")} />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSmsOptIn((prev) => !prev)}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-black text-white">Text updates</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Occasional texts about pools and tournaments.
                    </p>
                  </div>

                  <span className={cn("relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition", smsOptIn ? "bg-emerald-400" : "bg-white/10")}>
                    <span className={cn("inline-block h-5 w-5 rounded-full bg-white transition", smsOptIn ? "translate-x-5" : "translate-x-1")} />
                  </span>
                </button>

                <button
                  onClick={saveAccount}
                  disabled={saving}
                  className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : returnTo ? "Continue" : account ? "Save Account" : "Create Account"}
                </button>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card
              title="Plan"
              subtitle="Your Poolr access and credits."
              right={
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                  {planLabel}
                </span>
              }
            >
              <div className="space-y-3">
                <div className="rounded-[26px] border border-white/10 bg-black/22 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Plan</p>
                  <p className="mt-2 text-2xl font-black text-white">{planLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {hasActiveProAccess(account)
                      ? `Active until ${displayDate(account?.pro_active_until)}`
                      : account?.has_used_free_pool_experience
                        ? "Free pool used"
                        : "First pool still free"}
                  </p>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-black/22 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Single Pool Credits</p>
                  <p className="mt-2 text-2xl font-black text-white">{credits}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Credits unlock paid single-pool creation.
                  </p>
                </div>

                {hasBillingProfile ? (
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={billingLoading}
                    className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {billingLoading ? "Opening..." : "Manage / Cancel Membership"}
                  </button>
                ) : (
                  <ButtonLink href="/pricing" variant="primary">
                    View Plans
                  </ButtonLink>
                )}
              </div>
            </Card>

            <Card title="Navigation" subtitle="Jump back into Poolr.">
              <div className="grid gap-3">
                <ButtonLink href="/account" variant="primary">
                  Account Center
                </ButtonLink>
                <ButtonLink href="/create-pool" variant="ghost">
                  Create Pool
                </ButtonLink>
                <ButtonLink href="/join-pool" variant="ghost">
                  Join Pool
                </ButtonLink>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#030712] p-8 text-white">
          Loading Account Information...
        </main>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}

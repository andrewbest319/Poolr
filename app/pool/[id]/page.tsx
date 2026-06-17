"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  creator_poolr_user_id?: string | null;
  roster_size: number | null;
  counted_players: number | null;
  salary_cap: number | null;
  format: string | null;
  entry_fee?: number | null;
  max_players?: number | null;
  invite_code?: string | null;
  premium_enabled?: boolean | null;
  live_leaderboard_enabled?: boolean | null;
  chat_enabled?: boolean | null;
  bonus_points_enabled?: boolean | null;
  hidden_teams_before_lock?: boolean | null;
  payment_status?: string | null;
  purchase_type?: string | null;
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  lock_time: string | null;
  status: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type Entry = {
  id: string;
  user_id?: string | null;
  poolr_user_id?: string | null;
  pool_id: string;
  submitted: boolean | null;
  team_name?: string | null;
  created_at: string | null;
  paid?: boolean | null;
  payment_status?: string | null;
};

type Payout = {
  id: string;
  pool_id: string;
  place: number;
  label: string | null;
  percentage: number;
};

type PoolrUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  has_used_free_pool_experience?: boolean | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cleanInviteCode(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "$0";
  }

  return `$${Number(value).toLocaleString()}`;
}

function dateTimeText(value: string | null | undefined) {
  if (!value) return "Lock time TBD";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "Lock time TBD";

  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortDateText(value: string | null | undefined) {
  if (!value) return "TBD";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "TBD";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function tournamentWindow(tournament: Tournament | null) {
  const start = tournament?.start_date || tournament?.lock_time;

  if (!start) return "Tournament window TBD";

  const startDate = new Date(start);

  if (Number.isNaN(startDate.getTime())) return "Tournament window TBD";

  const endDate = tournament?.end_date ? new Date(tournament.end_date) : new Date(startDate);
  if (!tournament?.end_date) endDate.setDate(endDate.getDate() + 3);

  return `${shortDateText(startDate.toISOString())} — ${shortDateText(endDate.toISOString())}`;
}

function poolStatus(tournament: Tournament | null) {
  const status = String(tournament?.status ?? "Open").toLowerCase();

  if (status === "live") return "Live";
  if (status === "final") return "Final";
  if (status === "locked") return "Locked";
  if (status === "hidden") return "Hidden";

  const lockTime = tournament?.lock_time ? new Date(tournament.lock_time).getTime() : null;

  if (lockTime && !Number.isNaN(lockTime) && lockTime <= Date.now()) {
    return "Locked";
  }

  return "Open";
}

function isPoolLocked(tournament: Tournament | null) {
  const status = String(tournament?.status ?? "").toLowerCase();

  return (
    status === "locked" ||
    status === "live" ||
    status === "final" ||
    (!!tournament?.lock_time && new Date() >= new Date(tournament.lock_time))
  );
}

function placeLabel(place: number) {
  if (place === 1) return "1st Place";
  if (place === 2) return "2nd Place";
  if (place === 3) return "3rd Place";
  return `${place}th Place`;
}

function paymentStatus(entry: Entry) {
  const raw = String(entry.payment_status ?? "").toLowerCase();

  if (raw === "paid") return "Paid";
  if (raw === "unpaid") return "Unpaid";
  if (raw === "pay later" || raw === "pay_later" || raw === "pay-later") {
    return "Pay Later";
  }

  if (entry.paid === true) return "Paid";
  if (entry.paid === false) return "Unpaid";

  return "Untracked";
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>

      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function StatBox({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-black",
          tone === "default" && "text-white",
          tone === "green" && "text-emerald-300",
          tone === "yellow" && "text-yellow-100",
          tone === "red" && "text-red-300"
        )}
      >
        {value}
      </p>
      {note ? <p className="mt-1 text-sm text-slate-400">{note}</p> : null}
    </div>
  );
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "red" | "yellow" | "cyan";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
        tone === "green" && "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        tone === "red" && "border-rose-300/20 bg-rose-400/10 text-rose-200",
        tone === "yellow" && "border-yellow-300/20 bg-yellow-400/10 text-yellow-100",
        tone === "cyan" && "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
        tone === "default" && "border-white/10 bg-white/5 text-slate-300"
      )}
    >
      {children}
    </span>
  );
}

export default function PoolLobbyPage() {
  const params = useParams();
  const poolId = String(params?.id ?? "");

  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [poolrUserId, setPoolrUserId] = useState("");

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "members" | "team">(
    "overview"
  );
  const [loading, setLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadCurrentUser() {
    if (typeof window === "undefined") return;

    setAccountLoading(true);

    try {
      const savedUserId = localStorage.getItem("poolr_user_id");

      if (!savedUserId) {
        setPoolrUser(null);
        setPoolrUserId("");
        return;
      }

      const { data, error: userError } = await supabase
        .from("poolr_users")
        .select("*")
        .eq("id", savedUserId)
        .maybeSingle();

      if (userError || !data) {
        localStorage.removeItem("poolr_user_id");
        setPoolrUser(null);
        setPoolrUserId("");
        return;
      }

      const user = data as PoolrUser;
      setPoolrUser(user);
      setPoolrUserId(user.id);
    } catch (err) {
      console.warn("Could not load Poolr user:", err);
      setPoolrUser(null);
      setPoolrUserId("");
    } finally {
      setAccountLoading(false);
    }
  }

  async function loadPoolLobby() {
    setLoading(true);
    setError("");

    try {
      const { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .maybeSingle();

      if (poolError) throw new Error(poolError.message);

      if (!poolData) {
        setPool(null);
        setError("Pool not found.");
        return;
      }

      const loadedPool = poolData as Pool;
      setPool(loadedPool);

      if (loadedPool.tournament_id) {
        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", loadedPool.tournament_id)
          .maybeSingle();

        if (tournamentError) throw new Error(tournamentError.message);

        setTournament((tournamentData as Tournament | null) ?? null);
      } else {
        setTournament(null);
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("entries")
        .select("*")
        .eq("pool_id", loadedPool.id)
        .order("created_at", { ascending: true });

      if (entriesError) throw new Error(entriesError.message);

      setEntries((entriesData ?? []) as Entry[]);

      const { data: payoutsData, error: payoutsError } = await supabase
        .from("payouts")
        .select("*")
        .eq("pool_id", loadedPool.id)
        .order("place", { ascending: true });

      if (!payoutsError) {
        setPayouts((payoutsData ?? []) as Payout[]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pool.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!poolId) return;
    loadPoolLobby();
  }, [poolId]);

  const status = poolStatus(tournament);
  const locked = isPoolLocked(tournament);

  const inviteCode = cleanInviteCode(pool?.invite_code);

  const joinPath = inviteCode
    ? `/join-pool?code=${encodeURIComponent(inviteCode)}`
    : "/join-pool";

  const inviteLink =
    typeof window !== "undefined" && pool && inviteCode
      ? `${window.location.origin}${joinPath}`
      : "";

  const currentUserEntry = useMemo(() => {
    if (!poolrUserId) return null;
    return entries.find((entry) => entry.poolr_user_id === poolrUserId) ?? null;
  }, [entries, poolrUserId]);

  const isCreator =
    !!pool &&
    !!poolrUserId &&
    (!pool.creator_poolr_user_id || pool.creator_poolr_user_id === poolrUserId);

  const hasJoined = !!currentUserEntry;

  const entryFee = Number(pool?.entry_fee ?? 0);
  const currentPot = entries.length * entryFee;
  const submittedCount = entries.filter((entry) => entry.submitted).length;
  const paidCount = entries.filter((entry) => paymentStatus(entry) === "Paid").length;

  const maxPlayers = Number(pool?.max_players ?? 0);
  const spotsRemaining =
    maxPlayers > 0 ? Math.max(maxPlayers - entries.length, 0) : null;

  const rosterSize = Number(pool?.roster_size ?? 6);
  const countedPlayers = Number(pool?.counted_players ?? 4);
  const premiumEnabled = pool?.premium_enabled ?? true;
  const hideTeamsBeforeLock = pool?.hidden_teams_before_lock ?? true;
  const teamsAreHidden = hideTeamsBeforeLock && !locked && !isCreator;

  async function copyInviteLink() {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#040816] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Premium
            </p>
            <h1 className="mt-3 text-3xl font-black">Loading pool lobby...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Pulling pool, tournament, invite, and member data.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#040816] p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-red-400/20 bg-red-400/10 p-8">
          <h1 className="text-3xl font-black">Pool not found</h1>
          <p className="mt-3 text-red-100">{error || "This pool could not be loaded."}</p>

          <Link
            href="/create-pool"
            className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black"
          >
            Create Pool
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[460px] w-[460px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-12%] top-[12%] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[30%] h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-lg font-black text-emerald-200">
              P
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                Poolr Premium
              </p>
              <h1 className="text-xl font-black text-white">Pool Lobby</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
            >
              Account Center
            </Link>

            <Link
              href={`/account/settings?returnTo=${encodeURIComponent(`/pool/${pool.id}`)}`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
            >
              Account Info
            </Link>

            {isCreator && (
              <Link
                href={`/pool/${pool.id}/manage`}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200"
              >
                Manage Pool
              </Link>
            )}

            <Link
              href={`/pool/${pool.id}/leaderboard`}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400/15 px-4 py-2.5 text-sm font-black text-emerald-200 ring-1 ring-emerald-300/20 transition hover:bg-emerald-400/25"
            >
              Live Leaderboard
            </Link>

            {hasJoined && !locked && currentUserEntry ? (
              <Link
                href={`/pool/${pool.id}/build-team?entryId=${currentUserEntry.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Continue Team
              </Link>
            ) : !hasJoined && !locked ? (
              <Link
                href={joinPath}
                className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Join Pool
              </Link>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {poolrUser && !accountLoading && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-300">
              Signed in as{" "}
              <span className="font-black text-white">{poolrUser.full_name || "Poolr User"}</span>
              {hasJoined && currentUserEntry ? (
                <span className="text-slate-500"> • Team: {currentUserEntry.team_name || "Unnamed Team"}</span>
              ) : null}
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/account"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white transition hover:bg-white/10"
              >
                Account Center
              </Link>

              <Link
                href={`/account/settings?returnTo=${encodeURIComponent(`/pool/${pool.id}`)}`}
                className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-400/20"
              >
                Account Information
              </Link>
            </div>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,182,212,0.08),rgba(255,255,255,0.02))]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <StatusPill
                  tone={
                    status === "Open"
                      ? "green"
                      : status === "Locked"
                      ? "red"
                      : status === "Live"
                      ? "cyan"
                      : "yellow"
                  }
                >
                  {status}
                </StatusPill>

                <StatusPill>{pool.format || "Poolr"}</StatusPill>

                <StatusPill tone={premiumEnabled ? "green" : "default"}>
                  {premiumEnabled ? "Premium Pool" : "Standard Pool"}
                </StatusPill>

                {hasJoined && <StatusPill tone="cyan">Joined</StatusPill>}
                {isCreator && <StatusPill tone="yellow">Commissioner</StatusPill>}
              </div>

              <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                {pool.name || "Untitled Pool"}
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Premium tournament pool experience built for live scoring, hidden rosters before lock,
                sleek management, and competitive group play.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill>{tournament?.name || "Tournament not connected"}</StatusPill>
                {tournament?.location ? <StatusPill>{tournament.location}</StatusPill> : null}
                <StatusPill>{dateTimeText(tournament?.lock_time)}</StatusPill>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatBox label="Entry Fee" value={money(entryFee)} note="Group buy-in" />
                <StatBox label="Current Pot" value={money(currentPot)} note={`${entries.length} joined`} tone="green" />
                <StatBox
                  label="Roster Format"
                  value={`${rosterSize}/${countedPlayers}`}
                  note="Roster / counted"
                />
                <StatBox label="Lock Time" value={shortDateText(tournament?.lock_time)} note={dateTimeText(tournament?.lock_time)} />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Invite & Access
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white">Share this pool</h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Code</p>
                  <p className="mt-1 font-black tracking-[0.18em] text-emerald-300">
                    {inviteCode || "No code"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Tournament Window
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{tournamentWindow(tournament)}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {dateTimeText(tournament?.lock_time)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Team Visibility
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {teamsAreHidden
                      ? "Teams are hidden until lock."
                      : locked
                      ? "Teams are visible because the pool is locked or live."
                      : "Teams are visible before lock."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Spots Remaining
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {spotsRemaining === null ? "Unlimited" : spotsRemaining}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {maxPlayers > 0 ? `${entries.length} / ${maxPlayers} filled` : `${entries.length} joined`}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={copyInviteLink}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                >
                  {copied ? "Copied" : "Copy Invite Link"}
                </button>

                <Link
                  href={joinPath}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Preview Join Page
                </Link>
              </div>

              <p className="mt-4 break-all text-xs text-slate-500">
                {inviteLink || "Invite code unavailable."}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.05] p-2 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["overview", "Overview"],
              ["rules", "Rules"],
              ["members", "Members"],
              ["team", "My Team"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm font-black transition",
                  activeTab === key
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {activeTab === "overview" && (
            <>
              <SectionCard title="Pool Snapshot" subtitle="Everything players need at a glance.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatBox label="Members" value={entries.length} note="Current joined players" />
                  <StatBox label="Submitted" value={submittedCount} note="Teams submitted" />
                  <StatBox label="Paid" value={paidCount} note="Marked as paid" />
                  <StatBox label="Pot" value={money(currentPot)} note="Estimated prize pool" tone="green" />
                </div>
              </SectionCard>

              <SectionCard title="Prize Breakdown" subtitle="Current payout display.">
                {payouts.length === 0 ? (
                  <p className="text-sm text-slate-400">No payouts set yet.</p>
                ) : (
                  <div className="space-y-3">
                    {payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div>
                          <p className="font-black text-white">
                            {payout.label || placeLabel(Number(payout.place))}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {Number(payout.percentage)}% payout
                          </p>
                        </div>

                        <p className="text-lg font-black text-emerald-300">
                          {money(Math.round((currentPot * Number(payout.percentage)) / 100))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {activeTab === "rules" && (
            <>
              <SectionCard title="Pool Rules" subtitle="Live rules pulled from this pool.">
                <div className="space-y-4">
                  <StatBox label="Format" value={pool.format || "Poolr"} note="Competition format" />
                  <StatBox label="Roster" value={`${rosterSize} golfers`} note={`${countedPlayers} count toward score`} />
                  <StatBox label="Salary Cap" value={money(pool.salary_cap ?? 0)} note="Fake team budget" />
                  <StatBox label="Lock" value={dateTimeText(tournament?.lock_time)} note="Teams cannot edit after lock" />
                </div>
              </SectionCard>

              <SectionCard title="Premium Features" subtitle="What this pool includes.">
                <div className="space-y-3">
                  <StatusPill tone="green">Hidden picks before lock</StatusPill>
                  <StatusPill tone="green">Live leaderboard</StatusPill>
                  <StatusPill tone="green">Best counted golfers scoring</StatusPill>
                  <StatusPill tone="green">Premium invite flow</StatusPill>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "members" && (
            <SectionCard title="Members" subtitle="Joined players and team status. No contact information is shown here.">
              {entries.length === 0 ? (
                <p className="text-sm text-slate-400">No one has joined yet.</p>
              ) : teamsAreHidden ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                  <p className="text-lg font-black text-white">Teams hidden until lock 🔒</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Members have joined, but team names are hidden until the tournament locks.
                  </p>
                  <p className="mt-4 text-3xl font-black text-emerald-300">{entries.length}</p>
                  <p className="mt-1 text-sm text-slate-500">members joined</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black text-white">
                          {entry.team_name || `Team ${index + 1}`}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Joined {dateTimeText(entry.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={entry.submitted ? "green" : "yellow"}>
                          {entry.submitted ? "Submitted" : "Not Submitted"}
                        </StatusPill>

                        <StatusPill
                          tone={
                            paymentStatus(entry) === "Paid"
                              ? "green"
                              : paymentStatus(entry) === "Unpaid"
                              ? "red"
                              : "yellow"
                          }
                        >
                          {paymentStatus(entry)}
                        </StatusPill>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === "team" && (
            <SectionCard title="My Team" subtitle="Build or edit your roster before lock.">
              {!poolrUserId ? (
                <>
                  <p className="text-sm leading-7 text-slate-400">
                    Create or sign into your Poolr account before joining this pool.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/account/settings?returnTo=${encodeURIComponent(joinPath)}`}
                      className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                    >
                      Create Account
                    </Link>

                    <Link
                      href={joinPath}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Join Pool
                    </Link>
                  </div>
                </>
              ) : hasJoined && currentUserEntry ? (
                <>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                    <p className="text-sm font-black text-emerald-200">
                      You are in this pool.
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Team: {currentUserEntry.team_name || "Unnamed Team"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Status: {currentUserEntry.submitted ? "Submitted" : "Not submitted yet"}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {!locked && (
                      <Link
                        href={`/pool/${pool.id}/build-team?entryId=${currentUserEntry.id}`}
                        className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                      >
                        Build / Edit Team
                      </Link>
                    )}

                    <Link
                      href={`/pool/${pool.id}/leaderboard`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                    >
                      View Leaderboard
                    </Link>
                  </div>
                </>
              ) : locked ? (
                <>
                  <p className="text-sm leading-7 text-slate-400">
                    This pool is locked, so new teams can no longer join.
                  </p>

                  <div className="mt-5">
                    <Link
                      href={`/pool/${pool.id}/leaderboard`}
                      className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                    >
                      View Leaderboard
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-7 text-slate-400">
                    Join this pool to create your team and submit your roster before lock.
                  </p>

                  <div className="mt-5">
                    <Link
                      href={joinPath}
                      className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                    >
                      Join & Build Team
                    </Link>
                  </div>
                </>
              )}
            </SectionCard>
          )}
        </div>

        <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                Poolr Navigation
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Need to get back to your pools or account?
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Account Center is your home base. Account Information is where plan, credits, and cancellation live.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Account Center
              </Link>
              <Link
                href="/account/settings"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
              >
                Account Information
              </Link>
              <Link
                href="/create-pool"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Create Pool
              </Link>
              <Link
                href="/join-pool"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Join Pool
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

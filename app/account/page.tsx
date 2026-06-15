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
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type PoolrUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  has_used_free_pool_experience?: boolean | null;
  poolr_plan?: string | null;
  stripe_subscription_status?: string | null;
  pro_active_until?: string | null;
  single_pool_credits?: number | string | null;
  stripe_customer_id?: string | null;
};

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  creator_poolr_user_id?: string | null;
  roster_size?: number | null;
  counted_players?: number | null;
  format?: string | null;
  invite_code?: string | null;
  is_locked?: boolean | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type Tournament = {
  id: string;
  name: string | null;
  location?: string | null;
  course?: string | null;
  status?: string | null;
  start_date?: string | null;
};

type Entry = {
  id: string;
  pool_id: string;
  poolr_user_id?: string | null;
  team_name?: string | null;
  submitted?: boolean | null;
  created_at?: string | null;
};

type AccountPoolRow = {
  pool: Pool;
  tournament: Tournament | null;
  entry?: Entry | null;
};

const FAVORITES_STORAGE_KEY = "poolr_favorite_golfers_v1";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Date TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPoolFormat(value: string | null | undefined) {
  const raw = String(value ?? "Salary Cap").toLowerCase();
  if (raw.includes("tier")) return "Tiered Draft";
  return "Salary Cap";
}

function poolStatus(pool: Pool, tournament: Tournament | null) {
  const tournamentStatus = String(tournament?.status ?? "").toLowerCase();

  if (pool.is_locked) return "Locked";
  if (tournamentStatus === "live") return "Live";
  if (tournamentStatus === "final") return "Final";
  if (tournamentStatus === "locked") return "Locked";

  return "Open";
}

function entryStatus(entry: Entry | null | undefined) {
  if (!entry) return "No team yet";
  return entry.submitted ? "Submitted" : "Not submitted";
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

function getPlanSubline(user: PoolrUser | null) {
  if (!user) return "Create your account to start.";

  if (hasActiveProAccess(user)) {
    return `Unlimited premium pools${user.pro_active_until ? ` through ${displayDate(user.pro_active_until)}` : ""}`;
  }

  const credits = getSinglePoolCredits(user);
  if (credits > 0) return `${credits} paid pool credit${credits === 1 ? "" : "s"} ready`;
  if (user.has_used_free_pool_experience) return "Choose Single Pool or Pro to create more";
  return "Your first premium pool is still free";
}

function getCreatePoolHref(user: PoolrUser | null) {
  if (!user) return "/account/settings?returnTo=/create-pool";

  const credits = getSinglePoolCredits(user);

  if (hasActiveProAccess(user)) return "/create-pool";
  if (credits > 0) return "/create-pool";
  if (!user.has_used_free_pool_experience) return "/create-pool";

  return "/pricing?returnTo=/create-pool";
}

function ButtonLink({
  href,
  children,
  variant = "ghost",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "white" | "ghost" | "dark" | "danger";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition",
        variant === "primary" &&
          "bg-emerald-400 text-black shadow-[0_18px_60px_rgba(16,185,129,0.18)] hover:-translate-y-0.5 hover:bg-emerald-300",
        variant === "white" &&
          "bg-white text-slate-950 hover:-translate-y-0.5 hover:bg-slate-200",
        variant === "dark" &&
          "border border-white/10 bg-black/25 text-white hover:bg-white/10",
        variant === "danger" &&
          "border border-rose-300/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20",
        variant === "ghost" &&
          "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        className
      )}
    >
      {children}
    </Link>
  );
}

function Pill({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "green" | "gold" | "blue" | "rose";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
        tone === "dark" && "border-white/10 bg-white/5 text-slate-300",
        tone === "green" && "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        tone === "gold" && "border-amber-300/20 bg-amber-400/10 text-amber-100",
        tone === "blue" && "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
        tone === "rose" && "border-rose-300/20 bg-rose-400/10 text-rose-100"
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "dark",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "dark" | "green" | "gold" | "blue";
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)]",
        tone === "dark" && "border-white/10 bg-white/[0.045]",
        tone === "green" && "border-emerald-300/20 bg-emerald-400/10",
        tone === "gold" && "border-amber-300/20 bg-amber-400/10",
        tone === "blue" && "border-cyan-300/20 bg-cyan-400/10"
      )}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p>
      {sub ? <p className="mt-2 text-xs leading-5 text-slate-400">{sub}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  eyebrow,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] shadow-[0_28px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function PoolCard({
  row,
  created,
  deletingPoolId,
  onDeletePool,
}: {
  row: AccountPoolRow;
  created?: boolean;
  deletingPoolId?: string;
  onDeletePool?: (pool: Pool) => void;
}) {
  const { pool, tournament, entry } = row;
  const buildTeamHref = entry?.id
    ? `/pool/${pool.id}/build-team?entryId=${encodeURIComponent(entry.id)}`
    : `/pool/${pool.id}/build-team`;

  const deletingThisPool = deletingPoolId === pool.id;

  return (
    <div className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.022))] p-5 transition hover:-translate-y-0.5 hover:border-emerald-300/25 hover:bg-white/[0.075]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-300/80 via-cyan-300/40 to-transparent opacity-60" />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 pl-2">
          <div className="flex flex-wrap gap-2">
            <Pill tone="green">{poolStatus(pool, tournament)}</Pill>
            <Pill>{formatPoolFormat(pool.format)}</Pill>
            {created ? <Pill tone="gold">Commissioner</Pill> : <Pill tone="blue">Joined</Pill>}
          </div>

          <h3 className="mt-4 truncate text-2xl font-black tracking-tight text-white">
            {pool.name || "Untitled Pool"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {tournament?.name || "Tournament TBD"}
            {tournament?.location ? ` • ${tournament.location}` : ""}
            {tournament?.course ? ` • ${tournament.course}` : ""}
          </p>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Team</p>
              <p className="mt-1 font-black text-white">
                {entry?.team_name || (created ? "Commissioner" : "No team yet")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Entry</p>
              <p className="mt-1 font-black text-white">{entryStatus(entry)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Start</p>
              <p className="mt-1 font-black text-white">{displayDate(tournament?.start_date)}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          <ButtonLink href={`/pool/${pool.id}`} variant="dark">
            Lobby
          </ButtonLink>
          <ButtonLink href={buildTeamHref} variant="primary">
            {entry?.submitted ? "Edit Team" : "Build Team"}
          </ButtonLink>
          <ButtonLink href={`/pool/${pool.id}/leaderboard`} variant="ghost">
            Leaderboard
          </ButtonLink>
          {created ? (
            <>
              <ButtonLink href={`/pool/${pool.id}/manage`} variant="white">
                Manage
              </ButtonLink>
              <button
                type="button"
                onClick={() => onDeletePool?.(pool)}
                disabled={deletingThisPool}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingThisPool ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccountCenterInner() {
  const searchParams = useSearchParams();
  const noticeParam = searchParams.get("notice");

  const [account, setAccount] = useState<PoolrUser | null>(null);
  const [createdPools, setCreatedPools] = useState<AccountPoolRow[]>([]);
  const [joinedPools, setJoinedPools] = useState<AccountPoolRow[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteInput, setFavoriteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingPoolId, setDeletingPoolId] = useState("");
  const [notice, setNotice] = useState(noticeParam || "");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (userId: string) => {
    setLoading(true);

    try {
      const [userResult, createdResult, entriesResult] = await Promise.all([
        supabase.from("poolr_users").select("*").eq("id", userId).maybeSingle(),
        supabase.from("pools").select("*").eq("creator_poolr_user_id", userId),
        supabase
          .from("entries")
          .select("*")
          .eq("poolr_user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (userResult.error) throw new Error(userResult.error.message);
      if (createdResult.error) throw new Error(createdResult.error.message);
      if (entriesResult.error) throw new Error(entriesResult.error.message);

      if (!userResult.data) {
        localStorage.removeItem("poolr_user_id");
        setAccount(null);
        setCreatedPools([]);
        setJoinedPools([]);
        return;
      }

      const user = userResult.data as PoolrUser;
      setAccount(user);

      const created = (createdResult.data ?? []) as Pool[];
      const entries = (entriesResult.data ?? []) as Entry[];

      const allPoolIds = [
        ...new Set([
          ...created.map((pool) => pool.id),
          ...entries.map((entry) => entry.pool_id).filter(Boolean),
        ]),
      ];

      let poolMap = new Map<string, Pool>();
      let tournamentMap = new Map<string, Tournament>();

      if (allPoolIds.length > 0) {
        const { data: poolData, error: poolError } = await supabase
          .from("pools")
          .select("*")
          .in("id", allPoolIds);

        if (poolError) throw new Error(poolError.message);

        const allPools = (poolData ?? []) as Pool[];
        poolMap = new Map(allPools.map((pool) => [pool.id, pool]));

        const tournamentIds = [
          ...new Set(
            allPools
              .map((pool) => pool.tournament_id)
              .filter(Boolean) as string[]
          ),
        ];

        if (tournamentIds.length > 0) {
          const { data: tournamentData, error: tournamentError } = await supabase
            .from("tournaments")
            .select("*")
            .in("id", tournamentIds);

          if (tournamentError) throw new Error(tournamentError.message);

          tournamentMap = new Map(
            ((tournamentData ?? []) as Tournament[]).map((tournament) => [
              tournament.id,
              tournament,
            ])
          );
        }
      }

      const entryByPool = new Map<string, Entry>();
      for (const entry of entries) {
        if (!entryByPool.has(entry.pool_id)) {
          entryByPool.set(entry.pool_id, entry);
        }
      }

      const createdRows = created.map((pool) => {
        const fullPool = poolMap.get(pool.id) ?? pool;
        return {
          pool: fullPool,
          tournament: fullPool.tournament_id
            ? tournamentMap.get(fullPool.tournament_id) ?? null
            : null,
          entry: entryByPool.get(fullPool.id) ?? null,
        };
      });

      const joinedRows = entries
        .map((entry) => {
          const pool = poolMap.get(entry.pool_id);
          if (!pool) return null;

          return {
            pool,
            tournament: pool.tournament_id
              ? tournamentMap.get(pool.tournament_id) ?? null
              : null,
            entry,
          };
        })
        .filter(Boolean) as AccountPoolRow[];

      const sortRows = (rows: AccountPoolRow[]) =>
        [...rows].sort((a, b) => {
          const aTime = new Date(a.entry?.created_at || a.pool.created_at || "").getTime();
          const bTime = new Date(b.entry?.created_at || b.pool.created_at || "").getTime();

          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

      setCreatedPools(sortRows(createdRows));
      setJoinedPools(sortRows(joinedRows));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your Account Center."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUserId = localStorage.getItem("poolr_user_id");

    if (!savedUserId) {
      setLoading(false);
      return;
    }

    loadDashboard(savedUserId);
  }, [loadDashboard]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedFavorites = JSON.parse(
        localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]"
      );

      if (Array.isArray(savedFavorites)) {
        setFavorites(
          savedFavorites
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 12)
        );
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  function addFavoriteGolfer() {
    const value = favoriteInput.trim();

    if (!value) return;

    setFavorites((current) => {
      const withoutDuplicate = current.filter(
        (item) => item.toLowerCase() !== value.toLowerCase()
      );

      return [value, ...withoutDuplicate].slice(0, 12);
    });

    setFavoriteInput("");
  }

  function removeFavoriteGolfer(value: string) {
    setFavorites((current) => current.filter((item) => item !== value));
  }

  async function deletePool(pool: Pool) {
    if (!account?.id) {
      setError("You need to be signed in to delete a pool.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${pool.name || "Untitled Pool"}"? This removes the pool, entries, picks, and payouts. It will not delete the tournament field.`
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "This cannot be undone. Are you sure you want to permanently delete this pool?"
    );

    if (!doubleConfirmed) return;

    setDeletingPoolId(pool.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/pools/${pool.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorPoolrUserId: account.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete pool.");
      }

      setNotice(`Deleted "${pool.name || "Untitled Pool"}".`);
      await loadDashboard(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete pool.");
    } finally {
      setDeletingPoolId("");
    }
  }

  const totalPools = new Set([
    ...createdPools.map((row) => row.pool.id),
    ...joinedPools.map((row) => row.pool.id),
  ]).size;

  const planLabel = getPlanLabel(account);
  const planSubline = getPlanSubline(account);
  const credits = getSinglePoolCredits(account);
  const hasPro = hasActiveProAccess(account);
  const createHref = getCreatePoolHref(account);
  const recentPools = [...createdPools, ...joinedPools].slice(0, 3);

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-[560px] w-[560px] rounded-full bg-emerald-500/16 blur-3xl" />
        <div className="absolute right-[-10%] top-[2%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[20%] h-[620px] w-[620px] rounded-full bg-violet-500/12 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,7,18,0.25),rgba(3,7,18,0.96))]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.78),rgba(2,6,23,0.9))] p-6 shadow-[0_38px_140px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="green">Account Center</Pill>
                <Pill tone={hasPro ? "gold" : credits > 0 ? "blue" : "dark"}>{planLabel}</Pill>
                {account ? (
                  <Pill tone="dark">
                    {createdPools.length} created • {joinedPools.length} joined
                  </Pill>
                ) : null}
              </div>

              <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                My Pools.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Your clean home base for every Poolr pool you create, join, manage, and follow.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href={createHref} variant="primary">
                  Create Pool
                </ButtonLink>
                <ButtonLink href="/join-pool" variant="ghost">
                  Join Pool
                </ButtonLink>
                <ButtonLink href="/account/settings" variant="white">
                  Account Info
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-black/24 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                Current Access
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">{planLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{planSubline}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Credits</p>
                  <p className="mt-1 text-xl font-black text-white">{credits}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pools</p>
                  <p className="mt-1 text-xl font-black text-white">{totalPools}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

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

        {!account && !loading ? (
          <SectionCard
            eyebrow="Sign in"
            title="Find or create your Poolr account"
            subtitle="Account information lives on a separate page so this center stays focused on pools."
            right={
              <ButtonLink href="/account/settings" variant="primary">
                Continue
              </ButtonLink>
            }
          >
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-7">
              <p className="text-lg font-black text-white">Your pools will appear here after you continue.</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use your name, email, and phone to connect your created and joined pools.
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Plan"
                  value={planLabel}
                  sub={hasPro ? `Active until ${displayDate(account?.pro_active_until)}` : "Creator pays, players join free"}
                  tone={hasPro ? "gold" : credits > 0 ? "blue" : "green"}
                />
                <StatCard
                  label="Credits"
                  value={credits}
                  sub={credits > 0 ? "Ready for paid pools" : "No credits available"}
                  tone={credits > 0 ? "blue" : "dark"}
                />
                <StatCard
                  label="Free Pool"
                  value={account?.has_used_free_pool_experience ? "Used" : "Available"}
                  sub="One free premium pool per account"
                  tone={account?.has_used_free_pool_experience ? "dark" : "green"}
                />
                <StatCard
                  label="Connected"
                  value={totalPools}
                  sub={`${createdPools.length} created • ${joinedPools.length} joined`}
                  tone="dark"
                />
              </div>

              {loading ? (
                <SectionCard title="Loading Pools" subtitle="Loading your Poolr account..." eyebrow="My Pools">
                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-7 text-sm text-slate-400">
                    Loading...
                  </div>
                </SectionCard>
              ) : (
                <>
                  <SectionCard
                    eyebrow="Commissioner"
                    title="Pools You Created"
                    subtitle="Manage pools you own, share invites, lock rosters, and jump into leaderboards."
                    right={<ButtonLink href={createHref} variant="primary">Create Pool</ButtonLink>}
                  >
                    <div className="space-y-4">
                      {createdPools.length === 0 ? (
                        <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 p-8">
                          <p className="text-xl font-black text-white">No created pools yet.</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            Start a pool and it will appear here.
                          </p>
                        </div>
                      ) : (
                        createdPools.map((row) => (
                          <PoolCard
                            key={`created-${row.pool.id}`}
                            row={row}
                            created
                            deletingPoolId={deletingPoolId}
                            onDeletePool={deletePool}
                          />
                        ))
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard
                    eyebrow="Player"
                    title="Pools You Joined"
                    subtitle="Every pool where this account has a team or entry."
                    right={<ButtonLink href="/join-pool" variant="ghost">Join Pool</ButtonLink>}
                  >
                    <div className="space-y-4">
                      {joinedPools.length === 0 ? (
                        <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 p-8">
                          <p className="text-xl font-black text-white">No joined pools yet.</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            Join from an invite link or code, then your teams will appear here.
                          </p>
                        </div>
                      ) : (
                        joinedPools.map((row) => (
                          <PoolCard
                            key={`joined-${row.entry?.id || row.pool.id}`}
                            row={row}
                          />
                        ))
                      )}
                    </div>
                  </SectionCard>
                </>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <SectionCard
                eyebrow="Quick Actions"
                title="Poolr Control"
                subtitle="Everything important without clutter."
              >
                <div className="grid gap-3">
                  <ButtonLink href={createHref} variant="primary" className="w-full">
                    Create Pool
                  </ButtonLink>
                  <ButtonLink href="/join-pool" variant="ghost" className="w-full">
                    Join Pool
                  </ButtonLink>
                  <ButtonLink href="/account/settings" variant="white" className="w-full">
                    Account Information
                  </ButtonLink>
                  <ButtonLink href="/pricing" variant="dark" className="w-full">
                    Pricing
                  </ButtonLink>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Watchlist"
                title="Favorite Golfers"
                subtitle="A light personal watchlist for future pools."
              >
                <div className="flex gap-2">
                  <input
                    value={favoriteInput}
                    onChange={(event) => setFavoriteInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addFavoriteGolfer();
                    }}
                    placeholder="Scottie, Rory..."
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                  />
                  <button
                    type="button"
                    onClick={addFavoriteGolfer}
                    className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                  >
                    Add
                  </button>
                </div>

                {favorites.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                    Add players you always watch. Later we can highlight them on the golfer board.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {favorites.map((favorite) => (
                      <button
                        key={favorite}
                        type="button"
                        onClick={() => removeFavoriteGolfer(favorite)}
                        className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-rose-400/10 hover:text-rose-100"
                      >
                        {favorite} ×
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              {recentPools.length > 0 ? (
                <SectionCard eyebrow="Recent" title="Fast Access">
                  <div className="space-y-3">
                    {recentPools.map((row) => (
                      <Link
                        key={`recent-${row.pool.id}-${row.entry?.id || "created"}`}
                        href={`/pool/${row.pool.id}`}
                        className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/25 hover:bg-white/[0.05]"
                      >
                        <p className="truncate text-sm font-black text-white">
                          {row.pool.name || "Untitled Pool"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {row.tournament?.name || "Tournament TBD"} • {entryStatus(row.entry)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </SectionCard>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AccountCenterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#030712] p-8 text-white">
          Loading Account Center...
        </main>
      }
    >
      <AccountCenterInner />
    </Suspense>
  );
}

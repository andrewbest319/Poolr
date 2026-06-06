"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Pool = {
  id: string;
  name: string | null;
  invite_code: string | null;
  tournament_id: string | null;
  entry_fee: number | null;
  roster_size: number | null;
  counted_players: number | null;
  format: string | null;
  max_players?: number | null;
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  status: string | null;
  lock_time: string | null;
};

type Entry = {
  id: string;
  pool_id: string;
  poolr_user_id?: string | null;
  team_name: string | null;
  submitted: boolean | null;
  created_at: string | null;
};

type PoolrUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  has_used_free_pool_experience: boolean;
  first_pool_id: string | null;
  first_entry_id: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "$0";
  }

  return `$${Number(value).toLocaleString()}`;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Lock time TBD";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Lock time TBD";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function cleanCode(value: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function JoinPoolPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchString = searchParams.toString();
  const returnTo = `/join-pool${searchString ? `?${searchString}` : ""}`;

  const codeFromUrl = cleanCode(searchParams.get("code"));
  const poolIdFromUrl = String(searchParams.get("poolId") ?? "").trim();

  const [poolrUserId, setPoolrUserId] = useState("");
  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [accountReady, setAccountReady] = useState(false);

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [manualCode, setManualCode] = useState(codeFromUrl);
  const [teamName, setTeamName] = useState("");

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const spotsTaken = entries.length;
  const maxPlayers = Number(pool?.max_players ?? 0);
  const spotsRemaining =
    maxPlayers > 0 ? Math.max(maxPlayers - spotsTaken, 0) : null;

  const existingEntryForUser = useMemo(() => {
    if (!poolrUserId) return null;

    return (
      entries.find((entry) => entry.poolr_user_id === poolrUserId) ?? null
    );
  }, [entries, poolrUserId]);

  const isLocked = useMemo(() => {
    const status = String(tournament?.status ?? "").toLowerCase();

    return (
      status === "locked" ||
      status === "live" ||
      status === "final" ||
      (!!tournament?.lock_time && new Date() >= new Date(tournament.lock_time))
    );
  }, [tournament]);

  useEffect(() => {
    async function requireAccount() {
      if (typeof window === "undefined") return;

      const savedUserId = localStorage.getItem("poolr_user_id");

      if (!savedUserId) {
        router.replace(
          `/account?returnTo=${encodeURIComponent(returnTo)}`
        );
        return;
      }

      try {
        const { data, error } = await supabase
          .from("poolr_users")
          .select("*")
          .eq("id", savedUserId)
          .maybeSingle();

        if (error) throw new Error(error.message);

        if (!data) {
          localStorage.removeItem("poolr_user_id");
          router.replace(
            `/account?returnTo=${encodeURIComponent(returnTo)}`
          );
          return;
        }

        const user = data as PoolrUser;

        setPoolrUserId(user.id);
        setPoolrUser(user);
        setAccountReady(true);
      } catch (err) {
        console.error("Could not load Poolr account:", err);
        router.replace(
          `/account?returnTo=${encodeURIComponent(returnTo)}`
        );
      }
    }

    requireAccount();
  }, [router, returnTo]);

  async function loadPool({
    inviteCode,
    poolId,
  }: {
    inviteCode?: string;
    poolId?: string;
  }) {
    setLoading(true);
    setError("");

    try {
      let poolData: Pool | null = null;
      let poolError: any = null;

      if (poolId) {
        const result = await supabase
          .from("pools")
          .select("*")
          .eq("id", poolId)
          .maybeSingle();

        poolData = result.data as Pool | null;
        poolError = result.error;
      }

      if (!poolData && inviteCode) {
        const result = await supabase
          .from("pools")
          .select("*")
          .ilike("invite_code", inviteCode)
          .maybeSingle();

        poolData = result.data as Pool | null;
        poolError = result.error;
      }

      if (poolError) throw new Error(poolError.message);

      if (!poolData) {
        setPool(null);
        setTournament(null);
        setEntries([]);
        setError(
          "Pool not found. Check the invite code or ask the commissioner for a new link."
        );
        return;
      }

      setPool(poolData);
      setManualCode(poolData.invite_code ?? inviteCode ?? "");

      if (poolData.tournament_id) {
        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", poolData.tournament_id)
          .maybeSingle();

        if (tournamentError) throw new Error(tournamentError.message);

        setTournament((tournamentData as Tournament | null) ?? null);
      } else {
        setTournament(null);
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("entries")
        .select("*")
        .eq("pool_id", poolData.id)
        .order("created_at", { ascending: true });

      if (entriesError) throw new Error(entriesError.message);

      setEntries((entriesData ?? []) as Entry[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong loading this pool."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accountReady) return;

    if (poolIdFromUrl) {
      loadPool({ poolId: poolIdFromUrl });
      return;
    }

    if (codeFromUrl) {
      loadPool({ inviteCode: codeFromUrl });
      return;
    }

    setLoading(false);
  }, [accountReady, poolIdFromUrl, codeFromUrl]);

  async function searchByCode() {
    const nextCode = cleanCode(manualCode);

    if (!nextCode) {
      setError("Enter an invite code.");
      return;
    }

    router.replace(`/join-pool?code=${encodeURIComponent(nextCode)}`);
    await loadPool({ inviteCode: nextCode });
  }

  async function markFreeExperienceUsed(entryId: string, poolId: string) {
    if (!poolrUserId) return;

    const update: Record<string, unknown> = {
      has_used_free_pool_experience: true,
      last_pool_joined_at: new Date().toISOString(),
    };

    if (!poolrUser?.first_pool_id) {
      update.first_pool_id = poolId;
    }

    if (!poolrUser?.first_entry_id) {
      update.first_entry_id = entryId;
    }

    const { data, error } = await supabase
      .from("poolr_users")
      .update(update)
      .eq("id", poolrUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.warn("Could not mark free Poolr experience used:", error.message);
      return;
    }

    if (data) {
      setPoolrUser(data as PoolrUser);
    }
  }

  async function joinPool() {
    if (!pool) return;

    const finalTeamName = teamName.trim();

    if (!poolrUserId) {
      router.replace(
        `/account?returnTo=${encodeURIComponent(returnTo)}`
      );
      return;
    }

    if (!finalTeamName) {
      setError("Enter a team name before joining.");
      return;
    }

    if (isLocked) {
      setError("This pool is locked, so new teams cannot join.");
      return;
    }

    if (spotsRemaining !== null && spotsRemaining <= 0 && !existingEntryForUser) {
      setError("This pool is full.");
      return;
    }

    setJoining(true);
    setError("");

    try {
      if (existingEntryForUser) {
        await markFreeExperienceUsed(existingEntryForUser.id, pool.id);
        router.push(`/pool/${pool.id}/build-team?entryId=${existingEntryForUser.id}`);
        return;
      }

      const { data: entryData, error: entryError } = await supabase
        .from("entries")
        .insert({
          pool_id: pool.id,
          poolr_user_id: poolrUserId,
          team_name: finalTeamName,
          submitted: false,
        })
        .select("id")
        .single();

      if (entryError) throw new Error(entryError.message);

      const entryId = entryData?.id;

      if (!entryId) throw new Error("Entry was created, but no entry ID was returned.");

      await markFreeExperienceUsed(entryId, pool.id);

      router.push(`/pool/${pool.id}/build-team?entryId=${entryId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join pool.");
      setJoining(false);
    }
  }

  if (!accountReady) {
    return (
      <main className="min-h-screen bg-[#030712] p-8 text-white">
        Loading Poolr account...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-[-12%] top-[15%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-16%] left-[30%] h-[420px] w-[420px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[36px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Invite
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Join your golf pool.
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-400">
              Enter your invite code or open the invite link from your commissioner.
              Build your team before the pool locks.
            </p>

            {poolrUser && (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                <p className="text-sm font-black text-emerald-200">
                  Signed in as {poolrUser.full_name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {poolrUser.email} • {poolrUser.phone}
                </p>
              </div>
            )}

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-4">
              <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Invite Code
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                  placeholder="Example: PGA2026"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#080d19] px-4 py-3 font-black uppercase tracking-[0.16em] text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                />

                <button
                  onClick={searchByCode}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-slate-200"
                >
                  Find Pool
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">
                {error}
              </div>
            )}
          </section>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center text-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                    Searching
                  </p>
                  <h2 className="mt-3 text-3xl font-black">Loading pool...</h2>
                </div>
              </div>
            ) : !pool ? (
              <div className="flex min-h-[420px] items-center justify-center text-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                    No Pool Loaded
                  </p>
                  <h2 className="mt-3 text-3xl font-black">
                    Enter a valid invite code.
                  </h2>
                  <p className="mt-3 text-sm text-slate-400">
                    The pool will appear here when the code matches a pool in Supabase.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-black",
                      isLocked
                        ? "border-red-300/20 bg-red-400/10 text-red-200"
                        : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                    )}
                  >
                    {isLocked ? "LOCKED" : "OPEN"}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                    {pool.format || "Poolr"}
                  </span>

                  {existingEntryForUser && (
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
                      ALREADY JOINED
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-4xl font-black tracking-tight">
                  {pool.name || "Untitled Pool"}
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {tournament?.name || "Tournament"}{" "}
                  {tournament?.location ? `• ${tournament.location}` : ""}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Entry Fee
                    </p>
                    <p className="mt-2 text-2xl font-black">{money(pool.entry_fee)}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Members
                    </p>
                    <p className="mt-2 text-2xl font-black">{entries.length}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Roster
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {pool.roster_size ?? "—"}/{pool.counted_players ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Lock Time
                    </p>
                    <p className="mt-2 text-lg font-black">
                      {displayDate(tournament?.lock_time)}
                    </p>
                  </div>
                </div>

                {spotsRemaining !== null && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Spots Remaining
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-300">
                      {spotsRemaining}
                    </p>
                  </div>
                )}

                <div className="mt-7 rounded-3xl border border-white/10 bg-black/25 p-5">
                  <label className="text-sm font-black text-white">Team Name</label>

                  <input
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Example: Sunday Money Club"
                    disabled={!!existingEntryForUser}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#080d19] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    onClick={joinPool}
                    disabled={joining || isLocked}
                    className={cn(
                      "mt-4 w-full rounded-2xl px-5 py-4 text-sm font-black transition",
                      isLocked
                        ? "cursor-not-allowed bg-slate-600 text-slate-300"
                        : "bg-emerald-400 text-black hover:bg-emerald-300",
                      joining && "opacity-60"
                    )}
                  >
                    {isLocked
                      ? "Pool Locked"
                      : joining
                      ? "Joining..."
                      : existingEntryForUser
                      ? "Continue Building Team"
                      : "Join & Build Team"}
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/pool/${pool.id}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    Preview Pool
                  </Link>

                  <Link
                    href={`/pool/${pool.id}/leaderboard`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    View Leaderboard
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function JoinPoolPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#030712] p-8 text-white">
          Loading join page...
        </main>
      }
    >
      <JoinPoolPageInner />
    </Suspense>
  );
}
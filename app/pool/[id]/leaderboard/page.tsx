"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  roster_size: number | null;
  counted_players: number | null;
  salary_cap: number | null;
  format: string | null;
  entry_fee?: number | null;
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  lock_time: string | null;
  status: string | null;
};

type Entry = {
  id: string;
  user_id: string | null;
  pool_id: string;
  submitted: boolean | null;
  team_name?: string | null;
  created_at: string | null;
};

type Pick = {
  id: string;
  entry_id: string;
  golfer_id: string;
};

type Golfer = {
  id: string;
  name: string | null;
  salary: number | null;
  tier: number | null;
  country: string | null;
  world_rank: number | null;
};

type Score = {
  id: string;
  tournament_id: string | null;
  golfer_id: string | null;
  player_name: string | null;
  round: number | null;
  score: number | null;
  total_score: number | null;
  position: string | null;
  thru: string | null;
  status: string | null;
  updated_at: string | null;
};

type Payout = {
  id: string;
  pool_id: string;
  place: number;
  label: string | null;
  percentage: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeName(name: string | null | undefined) {
  const raw = String(name ?? "").trim();

  if (!raw) return "";

  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return `${first}${last}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function displayNameFromScore(name: string | null | undefined) {
  const raw = String(name ?? "").trim();

  if (!raw) return "Unknown Golfer";

  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return `${first} ${last}`;
  }

  return raw;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `$${Number(value).toLocaleString()}`;
}

function scoreText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const n = Number(value);

  if (n === 0) return "E";

  return n > 0 ? `+${n}` : `${n}`;
}

function dateText(value: string | null | undefined) {
  if (!value) return "Not updated yet";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "Not updated yet";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function lockText(tournament: Tournament | null) {
  const status = String(tournament?.status ?? "").toLowerCase();

  if (status === "live") return "Tournament is live — teams are locked";
  if (status === "final") return "Tournament final — teams are locked";
  if (!tournament?.lock_time) return "Lock time TBD";

  const lockTime = new Date(tournament.lock_time).getTime();
  const diff = lockTime - Date.now();

  if (Number.isNaN(lockTime)) return "Lock time TBD";
  if (diff <= 0) return "Teams are locked";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h until lock`;
  if (hours > 0) return `${hours}h ${minutes % 60}m until lock`;

  return `${Math.max(minutes, 0)}m until lock`;
}

function placeLabel(place: number) {
  if (place === 1) return "1st Place";
  if (place === 2) return "2nd Place";
  if (place === 3) return "3rd Place";

  return `${place}th Place`;
}

function playerDisplayName(golfer: Golfer | null, score: Score | null) {
  return golfer?.name || displayNameFromScore(score?.player_name);
}

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({});

  const isLocked = Boolean(
    String(tournament?.status ?? "").toLowerCase() === "live" ||
      String(tournament?.status ?? "").toLowerCase() === "final" ||
      (!!tournament?.lock_time && new Date() >= new Date(tournament.lock_time))
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem("poolr_previous_ranks");

      if (saved) {
        setPreviousRanks(JSON.parse(saved) as Record<string, number>);
      }
    } catch {
      setPreviousRanks({});
    }
  }, []);

  async function loadLeaderboard(showRefresh = false) {
    if (showRefresh) setRefreshing(true);

    setError("");

    try {
      let { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!poolData) {
        const fallback = await supabase
          .from("pools")
          .select("*")
          .eq("tournament_id", id)
          .maybeSingle();

        poolData = fallback.data;
        poolError = fallback.error;
      }

      if (poolError || !poolData) {
        setPool(null);
        setError("Pool not found.");
        return;
      }

      const loadedPool = poolData as Pool;
      setPool(loadedPool);

      let loadedTournament: Tournament | null = null;

      if (loadedPool.tournament_id) {
        const { data: tournamentData } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", loadedPool.tournament_id)
          .maybeSingle();

        loadedTournament = (tournamentData as Tournament | null) ?? null;
        setTournament(loadedTournament);
      } else {
        setTournament(null);
      }

      const { data: entriesData } = await supabase
        .from("entries")
        .select("*")
        .eq("pool_id", loadedPool.id)
        .order("created_at", { ascending: true });

      const loadedEntries = (entriesData ?? []) as Entry[];
      setEntries(loadedEntries);

      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("*")
        .eq("pool_id", loadedPool.id)
        .order("place", { ascending: true });

      setPayouts((payoutsData ?? []) as Payout[]);

      const entryIds = loadedEntries.map((entry) => entry.id);

      const { data: picksData } = await supabase
        .from("picks")
        .select("*")
        .in(
          "entry_id",
          entryIds.length ? entryIds : ["00000000-0000-0000-0000-000000000000"]
        );

      const loadedPicks = (picksData ?? []) as Pick[];
      setPicks(loadedPicks);

      const golferIds = [...new Set(loadedPicks.map((pick) => pick.golfer_id))];

      const { data: golfersData } = await supabase
        .from("golfers")
        .select("id, name, salary, tier, country, world_rank")
        .in(
          "id",
          golferIds.length ? golferIds : ["00000000-0000-0000-0000-000000000000"]
        );

      setGolfers((golfersData ?? []) as Golfer[]);

      const scoreTournamentIds = [
        loadedPool.tournament_id,
        loadedPool.id,
        id,
      ].filter(Boolean) as string[];

      const { data: scoresData, error: scoresError } = await supabase
        .from("scores")
        .select("*")
        .in(
          "tournament_id",
          scoreTournamentIds.length
            ? [...new Set(scoreTournamentIds)]
            : ["00000000-0000-0000-0000-000000000000"]
        )
        .order("total_score", { ascending: true });

      if (scoresError) {
        setError(scoresError.message);
      }

      setScores((scoresData ?? []) as Score[]);
      setLastLoaded(new Date());
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong loading the leaderboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();

    const interval = window.setInterval(() => {
      loadLeaderboard();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [id]);

  const uniqueScores = useMemo(() => {
    const map = new Map<string, Score>();

    for (const score of scores) {
      const key = score.golfer_id || normalizeName(score.player_name);

      if (!key) continue;

      const existing = map.get(key);

      if (!existing) {
        map.set(key, score);
        continue;
      }

      const existingTime = existing.updated_at
        ? new Date(existing.updated_at).getTime()
        : 0;

      const scoreTime = score.updated_at
        ? new Date(score.updated_at).getTime()
        : 0;

      if (scoreTime >= existingTime) {
        map.set(key, score);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aScore = Number(a.total_score ?? a.score ?? 999);
      const bScore = Number(b.total_score ?? b.score ?? 999);

      return aScore - bScore;
    });
  }, [scores]);

  const countedPlayers = Math.max(1, Number(pool?.counted_players ?? 4));
  const rosterSize = Math.max(1, Number(pool?.roster_size ?? 6));

  const leaderboard = useMemo(() => {
    const golferMap = new Map<string, Golfer>(
      golfers.map((golfer) => [golfer.id, golfer])
    );

    const scoreByGolferId = new Map<string, Score>();
    const scoreByName = new Map<string, Score>();

    for (const score of uniqueScores) {
      if (score.golfer_id) {
        scoreByGolferId.set(score.golfer_id, score);
      }

      if (score.player_name) {
        scoreByName.set(normalizeName(score.player_name), score);
      }
    }

    return entries
      .map((entry) => {
        const entryPicks = picks.filter((pick) => pick.entry_id === entry.id);

        const players = entryPicks
          .map((pick) => {
            const golfer = golferMap.get(pick.golfer_id) ?? null;

            const liveScore =
              scoreByGolferId.get(pick.golfer_id) ??
              scoreByName.get(normalizeName(golfer?.name)) ??
              null;

            const hasScore = Boolean(
              liveScore &&
                (liveScore.total_score !== null || liveScore.score !== null)
            );

            const total = hasScore
              ? Number(liveScore?.total_score ?? liveScore?.score ?? 0)
              : 999;

            const status = String(liveScore?.status ?? "").toLowerCase();
            const position = String(liveScore?.position ?? "").toLowerCase();

            const isCut = status.includes("cut") || position.includes("cut");

            return {
              pick,
              golfer,
              liveScore,
              total,
              hasScore,
              isCut,
              isHot: hasScore && total <= -5,
              isWarm: hasScore && total <= -3,
            };
          })
          .sort((a, b) => a.total - b.total);

        const counted = players
          .filter((player) => player.hasScore)
          .slice(0, countedPlayers);

        const teamTotal =
          counted.length > 0
            ? counted.reduce((sum, player) => sum + player.total, 0)
            : 999;

        const liveCount = players.filter((player) => player.hasScore).length;

        return {
          entry,
          players,
          counted,
          teamTotal,
          liveCount,
          bestPlayer: counted[0] ?? null,
        };
      })
      .sort((a, b) => a.teamTotal - b.teamTotal)
      .map((row, index) => {
        const rank = index + 1;
        const previousRank = previousRanks[row.entry.id];
        const movement = previousRank ? previousRank - rank : 0;

        return {
          ...row,
          rank,
          movement,
        };
      });
  }, [entries, picks, golfers, uniqueScores, countedPlayers, previousRanks]);

  useEffect(() => {
    if (leaderboard.length === 0) return;

    const nextRanks: Record<string, number> = {};

    leaderboard.forEach((row) => {
      nextRanks[row.entry.id] = row.rank;
    });

    localStorage.setItem("poolr_previous_ranks", JSON.stringify(nextRanks));
  }, [leaderboard]);

  const latestUpdate = useMemo(() => {
    const dates = uniqueScores
      .map((score) => score.updated_at)
      .filter(Boolean) as string[];

    if (dates.length === 0) return null;

    return dates.sort().slice(-1)[0];
  }, [uniqueScores]);

  const leader = leaderboard[0] ?? null;
  const submitted = entries.filter((entry) => entry.submitted).length;
  const entryFee = Number(pool?.entry_fee ?? 25);
  const totalPot = submitted * entryFee;
  const livePlayers = uniqueScores.length;
  const topLiveScores = uniqueScores.slice(0, 25);
  const picksVisible = isLocked;
  const displayRows = picksVisible
    ? leaderboard
    : [...leaderboard].sort((a, b) => {
        const aTime = a.entry.created_at
          ? new Date(a.entry.created_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bTime = b.entry.created_at
          ? new Date(b.entry.created_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        if (aTime !== bTime) return aTime - bTime;
        return String(a.entry.team_name ?? "").localeCompare(
          String(b.entry.team_name ?? "")
        );
      });

  if (loading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr
            </p>
            <h1 className="mt-3 text-3xl font-black">Loading live leaderboard...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Pulling pool data, picks, and DataGolf scores.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] p-8 text-white">
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
    <main className="relative isolate min-h-screen w-full max-w-full overflow-x-hidden bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 max-w-full overflow-hidden bg-[linear-gradient(135deg,rgba(16,185,129,0.12),transparent_32%,rgba(56,189,248,0.08)_68%,rgba(139,92,246,0.06))]" />

      <div className="relative mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8">
        <section className="w-full max-w-full overflow-hidden rounded-[42px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_35px_130px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
                  Poolr Live Leaderboard
                </p>

                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-black",
                    isLocked
                      ? "bg-red-400/15 text-red-200"
                      : "bg-emerald-400/15 text-emerald-200"
                  )}
                >
                  {isLocked ? "LOCKED" : "OPEN"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                  DATAGOLF LIVE
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                  AUTO REFRESH 30s
                </span>
              </div>

              <h1 className="mt-4 max-w-full break-words text-4xl font-black tracking-tight sm:text-6xl">
                {pool.name || "Poolr Pool"}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                {tournament?.name || "Tournament"}{" "}
                {tournament?.location ? `• ${tournament.location}` : ""} • Last
                DataGolf update: {dateText(latestUpdate)}
              </p>

              <p className="mt-2 text-sm font-bold text-emerald-200">
                {lockText(tournament)}
              </p>
            </div>

            <div className="flex w-full flex-wrap gap-3 sm:w-auto">
              <button
                onClick={() => loadLeaderboard(true)}
                disabled={refreshing}
                className="flex flex-1 justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-50 sm:flex-none"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href={`/pool/${pool.id}/build-team`}
                className={cn(
                  "flex flex-1 justify-center rounded-2xl px-5 py-3 text-sm font-black transition sm:flex-none",
                  isLocked
                    ? "cursor-not-allowed bg-slate-500 text-slate-200"
                    : "bg-emerald-400 text-black hover:bg-emerald-300"
                )}
                onClick={(event) => {
                  if (isLocked) event.preventDefault();
                }}
              >
                {isLocked ? "Teams Locked" : "Edit Team"}
              </Link>

              <Link
                href={`/pool/${pool.id}`}
                className="flex flex-1 justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 sm:flex-none"
              >
                Pool Home
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Teams" value={leaderboard.length} note="Total entries" />
            <StatCard label="Submitted" value={submitted} note="Locked teams" />
            <StatCard
              label="Leader"
              value={
                picksVisible && leader && leader.teamTotal !== 999
                  ? scoreText(leader.teamTotal)
                  : "Hidden"
              }
              note={picksVisible ? "Lowest total wins" : "Reveals at lock"}
              emerald={picksVisible}
            />
            <StatCard
              label="Live Feed"
              value={picksVisible ? livePlayers : "Hidden"}
              note={picksVisible ? "Players from DataGolf" : "Reveals at lock"}
            />
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 grid min-w-0 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 space-y-5">
            {!picksVisible && displayRows.length > 0 ? (
              <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/[0.08] p-5 text-center shadow-2xl backdrop-blur-xl">
                <p className="text-lg font-black text-emerald-100">
                  Picks hidden until lock
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Team totals, best picks, behind values, golfer names, and live scoring details reveal when the pool locks.
                </p>
              </div>
            ) : null}

            {displayRows.length === 0 ? (
              <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-xl">
                <p className="text-2xl font-black">No teams submitted yet.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Once teams are submitted, DataGolf-powered live rankings will appear here.
                </p>

                <Link
                  href={`/pool/${pool.id}/build-team`}
                  className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-6 py-4 font-black text-black"
                >
                  Build Team
                </Link>
              </div>
            ) : (
              displayRows.map((row) => {
                const payout = payouts.find(
                  (payoutItem) => Number(payoutItem.place) === row.rank
                );

                const winnings = payout
                  ? Math.round((totalPot * Number(payout.percentage)) / 100)
                  : 0;

                return (
                  <article
                    key={row.entry.id}
                    className={cn(
                      "w-full min-w-0 max-w-full overflow-hidden rounded-[30px] border bg-white/[0.055] shadow-[0_28px_95px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:rounded-[36px]",
                      picksVisible && row.rank === 1
                        ? "border-emerald-400/45"
                        : "border-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "flex w-full min-w-0 max-w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between",
                        picksVisible && row.rank === 1 && "bg-emerald-400/[0.075]"
                      )}
                    >
                      <div className="flex w-full min-w-0 items-start gap-3 sm:gap-4 lg:w-auto">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl font-black sm:h-16 sm:w-16 sm:rounded-3xl sm:text-2xl",
                            picksVisible &&
                              row.rank === 1 &&
                              "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
                            picksVisible &&
                              row.rank === 2 &&
                              "border-slate-300/20 bg-slate-300/10 text-slate-200",
                            picksVisible &&
                              row.rank === 3 &&
                              "border-orange-400/30 bg-orange-400/10 text-orange-200",
                            (!picksVisible || row.rank > 3) &&
                              "border-white/10 bg-white/5 text-white"
                          )}
                        >
                          {picksVisible ? row.rank : "—"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <h2 className="max-w-full break-words text-xl font-black leading-tight tracking-tight sm:text-2xl">
                              {row.entry.team_name ||
                                `Team ${row.entry.user_id?.slice(0, 6) || "User"}`}
                            </h2>

                            {picksVisible && row.movement > 0 && (
                              <span className="w-fit whitespace-nowrap rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black leading-none text-emerald-200 sm:px-3 sm:text-xs">
                                ↑ {row.movement}
                              </span>
                            )}

                            {picksVisible && row.movement < 0 && (
                              <span className="w-fit whitespace-nowrap rounded-full bg-red-400/15 px-2.5 py-1 text-[10px] font-black leading-none text-red-200 sm:px-3 sm:text-xs">
                                ↓ {Math.abs(row.movement)}
                              </span>
                            )}

                            {picksVisible && row.rank === 1 && (
                              <span className="w-fit whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black leading-none text-emerald-200 sm:px-3 sm:text-xs">
                                CURRENT LEADER
                              </span>
                            )}

                            {picksVisible && row.rank === 2 && (
                              <span className="w-fit whitespace-nowrap rounded-full border border-slate-300/20 bg-slate-300/10 px-2.5 py-1 text-[10px] font-black leading-none text-slate-200 sm:px-3 sm:text-xs">
                                CHASING LEADER
                              </span>
                            )}

                            {picksVisible && row.rank === 3 && (
                              <span className="w-fit whitespace-nowrap rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-[10px] font-black leading-none text-orange-200 sm:px-3 sm:text-xs">
                                IN THE MIX
                              </span>
                            )}

                            {picksVisible && winnings > 0 && (
                              <span className="w-fit whitespace-nowrap rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-black leading-none text-yellow-100 sm:px-3 sm:text-xs">
                                Projected {money(winnings)}
                              </span>
                            )}

                            {picksVisible ? (
                              <ScoringStatusBadge
                                isLocked={isLocked}
                                liveCount={row.liveCount}
                                playerCount={row.players.length}
                              />
                            ) : (
                              <span className="w-fit whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black leading-none text-emerald-200 sm:px-3 sm:text-xs">
                                PICKS HIDDEN
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs leading-5 text-slate-400 sm:mt-1 sm:text-sm">
                            {row.entry.submitted ? "Submitted" : "Draft"} •{" "}
                            {picksVisible
                              ? `${row.players.length}/${rosterSize} golfers • Best ${countedPlayers} count`
                              : "Team details reveal at lock"}
                          </p>
                        </div>
                      </div>

                      <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:min-w-[360px]">
                        <MiniCard
                          label="Total"
                          value={
                            !picksVisible
                              ? "Hidden"
                              : row.teamTotal === 999
                              ? "—"
                              : scoreText(row.teamTotal)
                          }
                          good={picksVisible ? row.teamTotal <= 0 : undefined}
                        />

                        <MiniCard
                          label="Best Pick"
                          value={
                            !picksVisible
                              ? "Reveals at lock"
                              : row.bestPlayer
                              ? `${playerDisplayName(
                                  row.bestPlayer.golfer,
                                  row.bestPlayer.liveScore
                                )} (${scoreText(row.bestPlayer.total)})`
                              : "—"
                          }
                        />

                        <MiniCard
                          label="Behind"
                          value={
                            !picksVisible
                              ? "Hidden"
                              : leader &&
                                  row.rank !== 1 &&
                                  leader.teamTotal !== 999 &&
                                  row.teamTotal !== 999
                              ? `${scoreText(row.teamTotal - leader.teamTotal)} back`
                              : "—"
                          }
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/10">
                      {!isLocked ? (
                        <div className="p-6 text-center sm:p-8">
                          <p className="text-lg font-black text-white">
                            Picks hidden until lock 🔒
                          </p>
                          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                            Teams are submitted, but golfers reveal when the tournament goes live.
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-full overflow-hidden">
                          <div className="hidden grid-cols-[minmax(0,1.45fr)_0.65fr_0.7fr_0.6fr_0.75fr] gap-3 bg-black/20 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 sm:grid">
                            <div>Golfer</div>
                            <div>Salary</div>
                            <div>Position</div>
                            <div>Total</div>
                            <div>Status</div>
                          </div>

                          <div className="divide-y divide-white/10">
                            {row.players.map((player) => {
                              const counted = row.counted.some(
                                (countedPlayer) =>
                                  countedPlayer.pick.id === player.pick.id
                              );

                              const displayName = playerDisplayName(
                                player.golfer,
                                player.liveScore
                              );

                              return (
                                <div
                                  key={player.pick.id}
                                  className={cn(
                                    "flex min-w-0 flex-col gap-3 px-4 py-4 transition sm:grid sm:grid-cols-[minmax(0,1.45fr)_0.65fr_0.7fr_0.6fr_0.75fr] sm:gap-3 sm:px-5",
                                    counted
                                      ? "bg-emerald-400/[0.04]"
                                      : "bg-white/[0.02] opacity-70"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <p className="break-words font-black text-white">
                                      {displayName}

                                      {player.isHot && (
                                        <span className="ml-2 rounded-full bg-orange-400/15 px-2 py-0.5 text-xs font-black text-orange-200">
                                          🔥 Hot
                                        </span>
                                      )}

                                      {!player.isHot && player.isWarm && (
                                        <span className="ml-2 rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-black text-yellow-100">
                                          Heating Up
                                        </span>
                                      )}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {player.golfer?.country ?? "—"}
                                      {player.golfer?.world_rank
                                        ? ` • World #${player.golfer.world_rank}`
                                        : ""}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2 text-sm font-bold text-slate-300 sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
                                      Salary
                                    </span>
                                    <span>{money(player.golfer?.salary)}</span>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2 text-sm font-bold text-slate-300 sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
                                      Position
                                    </span>
                                    <span>{player.liveScore?.position ?? "—"}</span>
                                  </div>

                                  <div
                                    className={cn(
                                      "flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2 text-sm font-black sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0",
                                      player.hasScore && player.total <= 0
                                        ? "text-emerald-300"
                                        : "text-red-300"
                                    )}
                                  >
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
                                      Total
                                    </span>
                                    <span>{player.hasScore ? scoreText(player.total) : "—"}</span>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2 sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
                                      Status
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-full px-3 py-1 text-xs font-black",
                                        player.isCut
                                          ? "bg-red-400/15 text-red-200"
                                          : counted && player.hasScore
                                            ? "bg-emerald-400/15 text-emerald-200"
                                            : counted && !player.hasScore
                                              ? "bg-yellow-400/10 text-yellow-100"
                                              : "bg-white/10 text-slate-400"
                                      )}
                                    >
                                      {player.isCut
                                        ? "Cut"
                                        : counted
                                          ? player.hasScore
                                            ? "Counted"
                                            : "No Score"
                                          : "Dropped"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <aside className="h-fit w-full min-w-0 max-w-full overflow-hidden rounded-[36px] border border-white/10 bg-[#07111f]/90 p-4 shadow-[0_28px_95px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-5 xl:sticky xl:top-6">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-300">
                  DataGolf Feed
                </p>
                <h2 className="mt-2 text-2xl font-black">Live Board</h2>
              </div>

              <span className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">
                Top 25
              </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Live scoring from your DataGolf sync powers every Poolr team ranking.
            </p>

            <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Payouts
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Pot: {money(totalPot)} • Entry: {money(entryFee)}
              </p>

              <div className="mt-4 space-y-2">
                {payouts.length === 0 ? (
                  <p className="text-sm text-slate-500">No payouts set yet.</p>
                ) : (
                  payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="min-w-0 truncate text-sm font-bold text-white">
                        {payout.label || placeLabel(Number(payout.place))}
                      </span>

                      <span className="text-sm font-black text-emerald-300">
                        {money(
                          Math.round(
                            (totalPot * Number(payout.percentage)) / 100
                          )
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 max-w-full overflow-hidden rounded-3xl border border-white/10">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_3rem_2.5rem] gap-2 bg-black/25 px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[0.45fr_minmax(0,1.45fr)_0.65fr_0.55fr] sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.18em]">
                <div>Pos</div>
                <div>Player</div>
                <div>Total</div>
                <div>Thru</div>
              </div>

              <div className="divide-y divide-white/10">
                {!picksVisible ? (
                  <div className="p-5 text-sm leading-6 text-slate-400">
                    Live player names and scores reveal when the pool locks.
                  </div>
                ) : topLiveScores.length === 0 ? (
                  <div className="p-5 text-sm text-slate-400">
                    No DataGolf live scoring found yet.
                  </div>
                ) : (
                  topLiveScores.map((score) => {
                    const total = Number(score.total_score ?? score.score ?? 0);

                    return (
                      <div
                        key={score.id}
                        className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_3rem_2.5rem] gap-2 px-3 py-3 sm:grid-cols-[0.45fr_minmax(0,1.45fr)_0.65fr_0.55fr] sm:gap-3 sm:px-4"
                      >
                        <div className="text-sm font-black text-white">
                          {score.position ?? "—"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {displayNameFromScore(score.player_name)}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {dateText(score.updated_at)}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "text-sm font-black",
                            total <= 0 ? "text-emerald-300" : "text-red-300"
                          )}
                        >
                          {scoreText(total)}
                        </div>

                        <div className="text-sm font-bold text-slate-400">
                          {score.thru ?? "—"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-slate-400">Last page refresh</span>
                <span className="min-w-0 text-right font-bold text-white">
                  {lastLoaded ? dateText(lastLoaded.toISOString()) : "—"}
                </span>
              </div>

              <div className="mt-2 flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-slate-400">Pool status</span>
                <span
                  className={cn(
                    "font-black",
                    isLocked ? "text-red-300" : "text-emerald-300"
                  )}
                >
                  {isLocked ? "Locked" : "Open"}
                </span>
              </div>

              <div className="mt-2 flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-slate-400">Format</span>
                <span className="min-w-0 truncate text-right font-bold text-white">
                  {pool.format || "Poolr"}
                </span>
              </div>

              <div className="mt-2 flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-slate-400">Roster</span>
                <span className="min-w-0 text-right font-bold text-white">
                  {rosterSize} golfers / best {countedPlayers}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}


function ScoringStatusBadge({
  isLocked,
  liveCount,
  playerCount,
}: {
  isLocked: boolean;
  liveCount: number;
  playerCount: number;
}) {
  let label = "SCORING PENDING";
  let classes = "border-yellow-400/20 bg-yellow-400/10 text-yellow-100";

  if (isLocked && playerCount > 0 && liveCount >= playerCount) {
    label = "LIVE SCORING";
    classes = "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  } else if (isLocked && liveCount > 0 && liveCount < playerCount) {
    label = "PARTIAL LIVE SCORING";
    classes = "border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
  }

  return (
    <span
      className={cn(
        "w-fit whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black leading-none sm:px-3 sm:text-xs",
        classes
      )}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
  emerald = false,
}: {
  label: string;
  value: string | number;
  note: string;
  emerald?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>

      <p
        className={cn(
          "mt-2 text-3xl font-black",
          emerald && "text-emerald-300"
        )}
      >
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-400">{note}</p>
    </div>
  );
}

function MiniCard({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-3 text-center sm:p-4">
      <p className="text-[10px] text-slate-500 sm:text-xs">{label}</p>

      <p
        className={cn(
          "mt-1 break-words text-xs font-black leading-tight sm:text-sm",
          good === true && "text-emerald-300",
          good === false && "text-red-300",
          good === undefined && "text-white"
        )}
      >
        {value}
      </p>
    </div>
  );
}

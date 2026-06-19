"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import {
  getTournamentLockTimestamp,
  isPoolLocked,
  isPoolManuallyLocked,
} from "../../../../lib/poolLock";

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  roster_size: number | null;
  counted_players: number | null;
  salary_cap: number | null;
  format: string | null;
  entry_fee?: number | null;
  is_locked?: boolean | null;
  locked_at?: string | null;
  unlocked_at?: string | null;
  lock_note?: string | null;
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  lock_time: string | null;
  status: string | null;
  start_date?: string | null;
  starts_at?: string | null;
  started_at?: string | null;
  start_time?: string | null;
};

type Entry = {
  id: string;
  user_id?: string | null;
  poolr_user_id?: string | null;
  pool_id: string;
  submitted: boolean | null;
  team_name?: string | null;
  created_at: string | null;
};

type Pick = {
  id: string;
  entry_id: string;
  golfer_id: string | null;
  player_id?: string | null;
  datagolf_id?: string | null;
  dg_id?: string | null;
  name?: string | null;
  golfer_name?: string | null;
  player_name?: string | null;
  salary?: number | string | null;
  poolr_salary?: number | string | null;
  price?: number | string | null;
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
  [key: string]: unknown;
};

type PlayerPrice = {
  id: string;
  tournament_id: string | null;
  golfer_id: string | null;
  player_name?: string | null;
  name?: string | null;
  salary?: number | string | null;
  price?: number | string | null;
  tier?: number | string | null;
  country?: string | null;
  world_rank?: number | string | null;
  datagolf_rank?: number | string | null;
  [key: string]: unknown;
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

  if (!raw) return "Golfer unavailable";

  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return `${first} ${last}`;
  }

  return raw;
}

function pickGolferId(pick: Pick) {
  return (
    String(
      pick.golfer_id ??
        pick.player_id ??
        pick.datagolf_id ??
        pick.dg_id ??
        ""
    ).trim() || null
  );
}

function pickStoredName(pick: Pick) {
  return (
    String(pick.golfer_name ?? pick.player_name ?? pick.name ?? "").trim() ||
    null
  );
}

function numericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(String(value).replace("+", "").replace(",", "").replace("$", ""));

  return Number.isFinite(numeric) ? numeric : null;
}

function pickStoredSalary(pick: Pick) {
  return (
    numericValue(pick.poolr_salary) ??
    numericValue(pick.salary) ??
    numericValue(pick.price)
  );
}

function playerPriceName(price: PlayerPrice | null | undefined) {
  return String(price?.player_name ?? price?.name ?? "").trim() || null;
}

function playerPriceSalary(price: PlayerPrice | null | undefined) {
  return numericValue(price?.salary) ?? numericValue(price?.price);
}

function playerPriceWorldRank(price: PlayerPrice | null | undefined) {
  return numericValue(price?.world_rank) ?? numericValue(price?.datagolf_rank);
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

function rankLabel(rank: number, tied: boolean) {
  return tied ? `T${rank}` : String(rank);
}

function hasLiveScoreValue(score: Score | null | undefined) {
  return liveTotalScore(score) !== null;
}

function liveTotalScore(score: Score | null | undefined) {
  return numericValue(score?.total_score);
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

function lockText(pool: Pool | null, tournament: Tournament | null) {
  const status = String(tournament?.status ?? "").toLowerCase();

  if (isPoolManuallyLocked(pool)) return "Pool manually locked by commissioner";
  if (status === "locked") return "Teams are locked";
  if (status === "live") return "Tournament is live — teams are locked";
  if (status === "final") return "Tournament final — teams are locked";
  if (status === "completed") return "Tournament complete — teams are locked";

  const lockTimestamp = getTournamentLockTimestamp(tournament);

  if (!lockTimestamp) return "Lock time TBD";

  const lockTime = new Date(lockTimestamp).getTime();
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

function playerDisplayName(
  golfer: Golfer | null,
  score: Score | null,
  price?: PlayerPrice | null,
  pick?: Pick | null
) {
  return (
    golfer?.name ||
    displayNameFromScore(
      score?.player_name ??
        playerPriceName(price) ??
        (pick ? pickStoredName(pick) : null)
    )
  );
}

function scoreField(score: Score | null | undefined, keys: string[]) {
  return rowField(score, keys);
}

function rowField(
  row: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = row?.[key];
    const text = String(value ?? "").trim();

    if (text) return text;
  }

  return null;
}

function rowFields(
  row: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  return keys
    .map((key) => rowField(row, [key]))
    .filter(Boolean) as string[];
}

const liveScoreIdentifierKeys = [
  "golfer_id",
  "player_id",
  "datagolf_id",
  "dg_id",
  "dg_player_id",
  "datagolf_player_id",
];

function positionText(score: Score | null | undefined) {
  const raw = String(score?.position ?? "").trim();

  if (!raw) return "—";

  const normalized = raw.toLowerCase();

  if (normalized === "waiting" || normalized.includes("not started")) {
    return "—";
  }

  return raw;
}

function formatClockTime(value: string) {
  const raw = value.trim();

  if (!raw) return raw;

  const dateLike = /\d{4}-\d{2}-\d{2}|T/.test(raw);
  const parsed = new Date(raw);

  if (dateLike && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (timeMatch) {
    const hour24 = Number(timeMatch[1]);
    const minute = timeMatch[2];

    if (Number.isFinite(hour24)) {
      const suffix = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 || 12;

      return `${hour12}:${minute} ${suffix}`;
    }
  }

  return raw;
}

function teeTimeText(score: Score | null | undefined) {
  const teeTime = scoreField(score, [
    "tee_time",
    "tee_time_local",
    "teeTime",
    "teetime",
    "start_time",
    "starting_time",
  ]);

  return teeTime ? `Tee ${formatClockTime(teeTime)}` : null;
}

function thruText(score: Score | null | undefined) {
  const raw = String(score?.thru ?? "").trim();

  if (!raw || raw === "0" || raw === "-" || raw === "--") return null;

  const lower = raw.toLowerCase();

  if (lower === "f" || lower === "fin" || lower === "finished") return "F";
  if (/^\d+$/.test(raw)) return `Thru ${Number(raw)}`;
  if (lower.includes("thru")) return raw;

  return raw;
}

function cleanStatus(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function playerLiveStatus(
  score: Score | null,
  hasScore: boolean,
  isCut: boolean
) {
  if (isCut) return { label: "Cut", tone: "danger" as const };

  const rawStatus = String(score?.status ?? "").trim();
  const status = rawStatus.toLowerCase();
  const thru = thruText(score);

  if (
    status === "wd" ||
    status.includes("withdraw") ||
    status.includes("disqual")
  ) {
    return { label: status === "wd" ? "WD" : cleanStatus(rawStatus), tone: "danger" as const };
  }

  if (
    thru === "F" ||
    status === "f" ||
    status.includes("finished") ||
    status.includes("complete")
  ) {
    return { label: "F", tone: "finished" as const };
  }

  if (thru) return { label: thru, tone: "live" as const };

  const teeTime = teeTimeText(score);

  if (teeTime) return { label: teeTime, tone: "pending" as const };

  if (status.includes("not started")) {
    return { label: "Not started", tone: "pending" as const };
  }

  if (rawStatus && status !== "live" && status !== "active") {
    return {
      label: cleanStatus(rawStatus),
      tone: hasScore ? ("live" as const) : ("pending" as const),
    };
  }

  if (hasScore) return { label: "In progress", tone: "live" as const };

  return { label: "No score", tone: "pending" as const };
}

function playerLiveStatusClass(tone: ReturnType<typeof playerLiveStatus>["tone"]) {
  if (tone === "danger") return "bg-red-400/15 text-red-200";
  if (tone === "finished") return "bg-emerald-400/15 text-emerald-200";
  if (tone === "live") return "bg-cyan-400/15 text-cyan-100";
  if (tone === "pending") return "bg-yellow-400/10 text-yellow-100";

  return "bg-white/10 text-slate-400";
}

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [playerPrices, setPlayerPrices] = useState<PlayerPrice[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({});
  const [poolrUserId, setPoolrUserId] = useState("");

  const isLocked = isPoolLocked(pool, tournament);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPoolrUserId(localStorage.getItem("poolr_user_id") ?? "");
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

      const golferIds = [
        ...new Set(
          loadedPicks.map((pick) => pickGolferId(pick)).filter(Boolean)
        ),
      ] as string[];

      const { data: golfersData } = await supabase
        .from("golfers")
        .select("id, name, salary, tier, country, world_rank")
        .in(
          "id",
          golferIds.length ? golferIds : ["00000000-0000-0000-0000-000000000000"]
        );

      setGolfers((golfersData ?? []) as Golfer[]);

      if (loadedPool.tournament_id) {
        const { data: pricesData, error: pricesError } = await supabase
          .from("player_prices")
          .select("*")
          .eq("tournament_id", loadedPool.tournament_id);

        if (pricesError) {
          console.warn("Could not load leaderboard player prices:", pricesError.message);
          setPlayerPrices([]);
        } else {
          setPlayerPrices((pricesData ?? []) as PlayerPrice[]);
        }
      } else {
        setPlayerPrices([]);
      }

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
      const aScore = liveTotalScore(a) ?? 999;
      const bScore = liveTotalScore(b) ?? 999;

      return aScore - bScore;
    });
  }, [scores]);

  const countedPlayers = Math.max(1, Number(pool?.counted_players ?? 4));
  const rosterSize = Math.max(1, Number(pool?.roster_size ?? 6));

  const leaderboard = useMemo(() => {
    const golferMap = new Map<string, Golfer>(
      golfers.map((golfer) => [golfer.id, golfer])
    );

    const priceById = new Map<string, PlayerPrice>();
    const priceByGolferId = new Map<string, PlayerPrice>();
    const priceByName = new Map<string, PlayerPrice>();

    for (const price of playerPrices) {
      if (price.id) {
        priceById.set(price.id, price);
      }

      if (price.golfer_id) {
        priceByGolferId.set(price.golfer_id, price);
      }

      const name = playerPriceName(price);

      if (name) {
        priceByName.set(normalizeName(name), price);
      }
    }

    const scoreByGolferId = new Map<string, Score>();
    const scoreByName = new Map<string, Score>();

    for (const score of uniqueScores) {
      for (const scoreId of rowFields(score, liveScoreIdentifierKeys)) {
        scoreByGolferId.set(scoreId, score);
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
            const pickId = pickGolferId(pick);
            const storedName = pickStoredName(pick);
            const initialPrice =
              (pickId ? priceById.get(pickId) : undefined) ??
              (pickId ? priceByGolferId.get(pickId) : undefined) ??
              (storedName ? priceByName.get(normalizeName(storedName)) : undefined) ??
              null;
            const priceScoreIds = [
              initialPrice?.id,
              ...rowFields(initialPrice, liveScoreIdentifierKeys),
            ].filter(Boolean) as string[];

            const golferFromId =
              (pickId ? golferMap.get(pickId) : undefined) ??
              (initialPrice?.golfer_id
                ? golferMap.get(initialPrice.golfer_id)
                : undefined) ??
              null;

            const liveScore =
              (pickId ? scoreByGolferId.get(pickId) : undefined) ??
              priceScoreIds
                .map((scoreId) => scoreByGolferId.get(scoreId))
                .find(Boolean) ??
              (storedName ? scoreByName.get(normalizeName(storedName)) : undefined) ??
              scoreByName.get(normalizeName(golferFromId?.name)) ??
              (initialPrice
                ? scoreByName.get(normalizeName(playerPriceName(initialPrice)))
                : undefined) ??
              null;

            const price =
              initialPrice ??
              (liveScore?.golfer_id
                ? priceByGolferId.get(liveScore.golfer_id)
                : undefined) ??
              (liveScore?.player_name
                ? priceByName.get(normalizeName(liveScore.player_name))
                : undefined) ??
              null;

            const resolvedName =
              golferFromId?.name ??
              liveScore?.player_name ??
              playerPriceName(price) ??
              storedName ??
              null;

            const golfer =
              golferFromId ??
              (resolvedName
                ? {
                    id: pickId ?? price?.golfer_id ?? price?.id ?? liveScore?.golfer_id ?? pick.id,
                    name: displayNameFromScore(resolvedName),
                    salary: playerPriceSalary(price) ?? pickStoredSalary(pick),
                    tier: numericValue(price?.tier),
                    country: price?.country ?? null,
                    world_rank: playerPriceWorldRank(price),
                  }
                : null);

            const hasScore = hasLiveScoreValue(liveScore);
            const tournamentTotal = liveTotalScore(liveScore);

            const total = tournamentTotal ?? 999;

            const status = String(liveScore?.status ?? "").toLowerCase();
            const position = String(liveScore?.position ?? "").toLowerCase();

            const isCut = status.includes("cut") || position.includes("cut");

            return {
              pick,
              golfer,
              price,
              pickedSalary:
                pickStoredSalary(pick) ??
                playerPriceSalary(price) ??
                golfer?.salary ??
                null,
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

        const liveCount = players.filter((player) => player.liveScore).length;

        return {
          entry,
          players,
          counted,
          teamTotal,
          liveCount,
          bestPlayer: counted[0] ?? null,
        };
      })
      .sort((a, b) => {
        if (a.teamTotal !== b.teamTotal) return a.teamTotal - b.teamTotal;

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
      })
      .map((row, index, sortedRows) => {
        const previousRow = sortedRows[index - 1];
        const tied =
          sortedRows.some(
            (otherRow, otherIndex) =>
              otherIndex !== index && otherRow.teamTotal === row.teamTotal
          ) &&
          row.teamTotal !== 999;
        const rank =
          previousRow && previousRow.teamTotal === row.teamTotal
            ? sortedRows.findIndex(
                (rankedRow) => rankedRow.teamTotal === row.teamTotal
              ) + 1
            : index + 1;
        const previousRank = previousRanks[row.entry.id];
        const movement = previousRank ? previousRank - rank : 0;

        return {
          ...row,
          rank,
          rankLabel: rankLabel(rank, tied),
          tied,
          movement,
        };
      });
  }, [
    entries,
    picks,
    golfers,
    playerPrices,
    uniqueScores,
    countedPlayers,
    previousRanks,
  ]);

  useEffect(() => {
    if (!isLocked || leaderboard.length === 0) return;

    const nextRanks: Record<string, number> = {};

    leaderboard.forEach((row) => {
      nextRanks[row.entry.id] = row.rank;
    });

    localStorage.setItem("poolr_previous_ranks", JSON.stringify(nextRanks));
  }, [leaderboard, isLocked]);

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
  const isCurrentUserEntry = (entry: Entry) =>
    Boolean(
      poolrUserId &&
        (entry.poolr_user_id === poolrUserId || entry.user_id === poolrUserId)
    );

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

      <div className="relative mx-auto box-border w-full max-w-[100vw] min-w-0 overflow-x-hidden px-4 py-5 sm:max-w-7xl sm:px-6 sm:py-8 lg:px-8">
        <section className="box-border w-full max-w-full overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:rounded-[42px] sm:p-6 sm:shadow-[0_35px_130px_rgba(0,0,0,0.52)]">
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
                live sync: {dateText(latestUpdate)}
              </p>

              <p className="mt-2 text-sm font-bold text-emerald-200">
                {lockText(pool, tournament)}
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

        <div className="mt-5 grid w-full min-w-0 max-w-full gap-5 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
          <section className="w-full min-w-0 max-w-full space-y-5">
            {!picksVisible && displayRows.length > 0 ? (
              <div className="box-border w-full max-w-[calc(100vw-32px)] overflow-hidden rounded-[24px] border border-emerald-400/20 bg-emerald-400/[0.08] p-4 text-center shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:max-w-full sm:rounded-[28px] sm:p-5 sm:shadow-2xl">
                <p className="text-lg font-black text-emerald-100">
                  Picks hidden until lock
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Your submitted roster is visible only to you. Other team totals, best picks, behind values, golfer names, and live scoring details reveal when the pool locks.
                </p>
              </div>
            ) : null}

            {displayRows.length === 0 ? (
              <div className="box-border w-full max-w-[calc(100vw-32px)] overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.05] p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:max-w-full sm:rounded-[34px] sm:p-8 sm:shadow-2xl">
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
                const canViewTeam = picksVisible || isCurrentUserEntry(row.entry);

                return (
                  <article
                    key={row.entry.id}
                    className={cn(
                      "box-border w-full min-w-0 max-w-[calc(100vw-32px)] overflow-hidden rounded-[26px] border bg-white/[0.055] shadow-[0_18px_55px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:max-w-full sm:rounded-[36px] sm:shadow-[0_28px_95px_rgba(0,0,0,0.38)]",
                      picksVisible && row.rank === 1
                        ? "border-emerald-400/45"
                        : "border-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "box-border flex w-full min-w-0 max-w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between",
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
                          {picksVisible ? row.rankLabel : "—"}
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

                            {picksVisible && row.rank === 1 && row.tied && (
                              <span className="w-fit whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black leading-none text-emerald-200 sm:px-3 sm:text-xs">
                                TIED LEADER
                              </span>
                            )}

                            {picksVisible && row.rank === 1 && !row.tied && (
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

                            {canViewTeam ? (
                              <ScoringStatusBadge
                                isLocked={isLocked}
                                liveCount={row.liveCount}
                              />
                            ) : (
                              <span className="w-fit whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black leading-none text-emerald-200 sm:px-3 sm:text-xs">
                                PICKS HIDDEN
                              </span>
                            )}

                            {!picksVisible && isCurrentUserEntry(row.entry) ? (
                              <span className="w-fit whitespace-nowrap rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black leading-none text-cyan-100 sm:px-3 sm:text-xs">
                                YOUR TEAM
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 text-xs leading-5 text-slate-400 sm:mt-1 sm:text-sm">
                            {row.entry.submitted ? "Submitted" : "Draft"} •{" "}
                            {canViewTeam
                              ? `${row.players.length}/${rosterSize} golfers • Best ${countedPlayers} count`
                              : "Team details reveal at lock"}
                          </p>
                        </div>
                      </div>

                      <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:min-w-[360px]">
                        <MiniCard
                          label="Total"
                          value={
                            !canViewTeam
                              ? "Hidden"
                              : row.teamTotal === 999
                              ? "—"
                              : scoreText(row.teamTotal)
                          }
                          good={canViewTeam ? row.teamTotal <= 0 : undefined}
                        />

                        <MiniCard
                          label="Best Pick"
                          value={
                            !canViewTeam
                              ? "Reveals at lock"
                              : row.bestPlayer
                              ? `${playerDisplayName(
                                  row.bestPlayer.golfer,
                                  row.bestPlayer.liveScore,
                                  row.bestPlayer.price,
                                  row.bestPlayer.pick
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
                                  leader.teamTotal !== 999 &&
                                  row.teamTotal !== 999 &&
                                  row.teamTotal !== leader.teamTotal
                              ? `${scoreText(row.teamTotal - leader.teamTotal)} back`
                              : "—"
                          }
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/10">
                      {!canViewTeam ? (
                        <div className="p-6 text-center sm:p-8">
                          <p className="text-lg font-black text-white">
                            Picks hidden until lock 🔒
                          </p>
                          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                            This team is submitted, but its golfers reveal when the tournament goes live.
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
                              const liveStatus = playerLiveStatus(
                                player.liveScore,
                                player.hasScore,
                                player.isCut
                              );

                              const displayName = playerDisplayName(
                                player.golfer,
                                player.liveScore,
                                player.price,
                                player.pick
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

                                      {picksVisible && (
                                        <span
                                          className={cn(
                                            "ml-2 rounded-full px-2 py-0.5 text-xs font-black",
                                            counted
                                              ? "bg-emerald-400/15 text-emerald-200"
                                              : "bg-white/10 text-slate-400"
                                          )}
                                        >
                                          {counted ? "Counted" : "Bench"}
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
                                    <span>{money(player.pickedSalary)}</span>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2 text-sm font-bold text-slate-300 sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
                                      Position
                                    </span>
                                    <span>{positionText(player.liveScore)}</span>
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
                                        !picksVisible
                                          ? "bg-emerald-400/15 text-emerald-200"
                                          : playerLiveStatusClass(liveStatus.tone)
                                      )}
                                    >
                                      {!picksVisible
                                        ? "Picked"
                                        : liveStatus.label}
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

          <aside className="box-border h-fit w-full min-w-0 max-w-[calc(100vw-32px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#07111f]/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:max-w-full sm:rounded-[36px] sm:p-5 sm:shadow-[0_28px_95px_rgba(0,0,0,0.42)] xl:sticky xl:top-6">
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

            <div className="mt-5 box-border w-full max-w-full overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
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

            <div className="mt-5 box-border w-full max-w-full overflow-hidden rounded-3xl border border-white/10">
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
                    const hasScore = hasLiveScoreValue(score);
                    const total = liveTotalScore(score);

                    return (
                      <div
                        key={score.id}
                        className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_3rem_2.5rem] gap-2 px-3 py-3 sm:grid-cols-[0.45fr_minmax(0,1.45fr)_0.65fr_0.55fr] sm:gap-3 sm:px-4"
                      >
                        <div className="text-sm font-black text-white">
                          {positionText(score)}
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
                            hasScore && Number(total) <= 0
                              ? "text-emerald-300"
                              : "text-red-300"
                          )}
                        >
                          {hasScore ? scoreText(total) : "—"}
                        </div>

                        <div className="text-sm font-bold text-slate-400">
                          {thruText(score) ?? "—"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-5 box-border w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-slate-400">Last page refresh</span>
                <span className="min-w-0 text-right font-bold text-white">
                  {lastLoaded ? dateText(lastLoaded.toISOString()) : "—"}
                </span>
              </div>

              <div className="mt-2 flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-slate-400">Last live sync</span>
                <span className="min-w-0 text-right font-bold text-white">
                  {dateText(latestUpdate)}
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
}: {
  isLocked: boolean;
  liveCount: number;
}) {
  let label = "SCORING PENDING";
  let classes = "border-yellow-400/20 bg-yellow-400/10 text-yellow-100";

  if (isLocked && liveCount > 0) {
    label = "LIVE SCORING";
    classes = "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
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

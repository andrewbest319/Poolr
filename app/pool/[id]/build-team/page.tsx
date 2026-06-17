"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  roster_size: number | null;
  counted_players: number | null;
  salary_cap: number | null;
  format: string | null;
  is_locked?: boolean | null;
  locked_at?: string | null;
  unlocked_at?: string | null;
  lock_note?: string | null;
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  course?: string | null;
  lock_time: string | null;
  status: string | null;
  start_date?: string | null;
};

type PoolrUser = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  has_used_free_pool_experience?: boolean | null;
  first_pool_id?: string | null;
  first_entry_id?: string | null;
};

type Entry = {
  id: string;
  pool_id: string;
  user_id?: string | null;
  poolr_user_id?: string | null;
  team_name: string | null;
  submitted: boolean | null;
  created_at: string | null;
};

type Pick = {
  id: string;
  entry_id: string;
  golfer_id: string;
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
  datagolf_rank?: number | string | null;
  rank?: number | string | null;
  world_rank?: number | string | null;
  win_odds?: string | number | null;
  odds?: string | number | null;
  american_odds?: string | number | null;
  outright_odds?: string | number | null;
  odds_to_win?: string | number | null;
  dg_win_odds?: string | number | null;
  top_5_odds?: string | number | null;
  top_10_odds?: string | number | null;
  country?: string | null;
  [key: string]: unknown;
};

type Golfer = {
  id: string;
  name: string;
  salary: number;
  tier: number;
  win_odds: string | number | null;
  top_5_odds: string | number | null;
  top_10_odds: string | number | null;
  country: string | null;
  datagolf_rank: number | null;
  world_rank: number | null;
  tournament_id: string | null;
  player_price_id: string;
};

type SortMode = "favorite" | "salary" | "name" | "tier" | "rank";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `$${Number(value).toLocaleString()}`;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const cleaned = String(value)
    .trim()
    .replace("+", "")
    .replace(",", "")
    .replace("$", "");

  const num = Number(cleaned);

  return Number.isFinite(num) ? num : null;
}

function normalizeName(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return `${first} ${last}`.replace(/\s+/g, " ").trim();
  }

  return raw.replace(/\s+/g, " ").trim();
}

function searchSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

function formatOdds(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Odds pending";
  }

  const raw = String(value).trim();

  if (!raw || raw === "null" || raw === "undefined") return "Odds pending";
  if (raw.toLowerCase() === "pending") return "Odds pending";

  if (raw.startsWith("+") || raw.startsWith("-")) return raw;

  const num = Number(raw);

  if (!Number.isFinite(num)) return raw;

  return num > 0 ? `+${num}` : `${num}`;
}

function getOddsRaw(row: PlayerPrice | Golfer) {
  return (
    row.win_odds ??
    ("odds" in row ? row.odds : null) ??
    ("american_odds" in row ? row.american_odds : null) ??
    ("outright_odds" in row ? row.outright_odds : null) ??
    ("odds_to_win" in row ? row.odds_to_win : null) ??
    ("dg_win_odds" in row ? row.dg_win_odds : null) ??
    null
  );
}

function getOddsNumber(row: PlayerPrice | Golfer) {
  return cleanNumber(getOddsRaw(row));
}

function getRankNumber(row: PlayerPrice | Golfer) {
  return (
    cleanNumber(row.datagolf_rank) ??
    cleanNumber(row.world_rank) ??
    ("rank" in row ? cleanNumber(row.rank) : null) ??
    9999
  );
}

function sortByFavorite(a: Golfer, b: Golfer) {
  const aOdds = getOddsNumber(a);
  const bOdds = getOddsNumber(b);

  if (aOdds !== null && bOdds !== null) {
    return aOdds - bOdds;
  }

  if (aOdds !== null) return -1;
  if (bOdds !== null) return 1;

  const aRank = getRankNumber(a);
  const bRank = getRankNumber(b);

  if (aRank !== bRank) return aRank - bRank;

  if (a.salary !== b.salary) return b.salary - a.salary;

  return a.name.localeCompare(b.name);
}

function defaultSalary(index: number) {
  const starting = 11500;
  const step = 125;

  return Math.max(5500, starting - index * step);
}

function defaultTier(index: number, fieldSize: number) {
  const tierCount = 6;
  const tierSize = Math.max(1, Math.ceil(fieldSize / tierCount));

  return Math.min(tierCount, Math.floor(index / tierSize) + 1);
}

function getTournamentLockTimestamp(tournament: Tournament | null) {
  return tournament?.lock_time || tournament?.start_date || null;
}

function lockText(pool: Pool | null, tournament: Tournament | null) {
  const status = String(tournament?.status ?? "").toLowerCase();

  if (pool?.is_locked) return "Pool manually locked by commissioner";
  if (status === "live") return "Tournament is live — teams are locked";
  if (status === "final") return "Tournament final — teams are locked";
  if (status === "locked") return "Teams are locked";

  const rawLockTimestamp = getTournamentLockTimestamp(tournament);

  if (!rawLockTimestamp) return "Lock time TBD";

  const lockTime = new Date(rawLockTimestamp).getTime();

  if (Number.isNaN(lockTime)) return "Lock time TBD";

  const diff = lockTime - Date.now();

  if (diff <= 0) return "Teams are locked";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h until lock`;
  if (hours > 0) return `${hours}h ${minutes % 60}m until lock`;

  return `${Math.max(minutes, 0)}m until lock`;
}

function isTournamentLocked(tournament: Tournament | null) {
  const status = String(tournament?.status ?? "").toLowerCase();
  const rawLockTimestamp = getTournamentLockTimestamp(tournament);

  return (
    status === "locked" ||
    status === "live" ||
    status === "final" ||
    (!!rawLockTimestamp && new Date() >= new Date(rawLockTimestamp))
  );
}

function isPoolLocked(pool: Pool | null, tournament: Tournament | null) {
  return pool?.is_locked === true || isTournamentLocked(tournament);
}

function getPlayerName(row: PlayerPrice) {
  return normalizeName(row.player_name || row.name || "Unknown Golfer");
}

function getPlayerSalary(row: PlayerPrice, index: number) {
  return (
    cleanNumber(row.salary) ??
    cleanNumber(row.price) ??
    defaultSalary(index)
  );
}

function getPlayerTier(row: PlayerPrice, index: number, fieldSize: number) {
  return cleanNumber(row.tier) ?? defaultTier(index, fieldSize);
}

function buildGolferFromPrice(row: PlayerPrice, index: number, fieldSize: number): Golfer {
  const rank = getRankNumber(row);
  const odds = getOddsRaw(row);

  return {
    id: row.golfer_id || row.id,
    player_price_id: row.id,
    name: getPlayerName(row),
    salary: getPlayerSalary(row, index),
    tier: getPlayerTier(row, index, fieldSize),
    win_odds: odds,
    top_5_odds: row.top_5_odds ?? null,
    top_10_odds: row.top_10_odds ?? null,
    country: row.country ?? null,
    datagolf_rank: rank === 9999 ? null : rank,
    world_rank: cleanNumber(row.world_rank),
    tournament_id: row.tournament_id,
  };
}

function deDupePlayers(players: Golfer[]) {
  const seen = new Set<string>();

  return players.filter((player) => {
    const key = `${player.id}-${searchSafe(player.name)}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function OddsBadge({
  odds,
  compact = false,
}: {
  odds: string | number | null | undefined;
  compact?: boolean;
}) {
  const label = formatOdds(odds);
  const hasOdds = label !== "Odds pending";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
        hasOdds
          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.14)]"
          : "border-white/10 bg-white/[0.04] text-white/40",
        compact && "px-2 py-0.5 text-[9px]"
      )}
      title={hasOdds ? `${label} odds to win` : "Odds are not available yet"}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          hasOdds ? "bg-emerald-300" : "bg-white/25"
        )}
      />
      {hasOdds ? `${label} to win` : "Odds pending"}
    </span>
  );
}

function Stat({
  label,
  value,
  good,
  warning,
}: {
  label: string;
  value: string | number;
  good?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>

      <p
        className={cn(
          "mt-2 text-3xl font-black",
          good === true && "text-emerald-300",
          good === false && "text-red-300",
          warning && "text-yellow-200"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function BuildTeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const poolId = params.id;
  const entryIdFromUrl = String(searchParams.get("entryId") ?? "").trim();

  const [poolrUserId, setPoolrUserId] = useState("");
  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [accountReady, setAccountReady] = useState(false);

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("My Poolr Team");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("salary");

  const returnTo = `/pool/${poolId}/build-team${
    entryIdFromUrl ? `?entryId=${encodeURIComponent(entryIdFromUrl)}` : ""
  }`;

  useEffect(() => {
    async function requirePoolrAccount() {
      if (typeof window === "undefined") return;

      const savedUserId = localStorage.getItem("poolr_user_id");

      if (!savedUserId) {
        router.replace(`/account?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      try {
        const { data, error: userError } = await supabase
          .from("poolr_users")
          .select("*")
          .eq("id", savedUserId)
          .maybeSingle();

        if (userError || !data) {
          localStorage.removeItem("poolr_user_id");
          router.replace(`/account?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        const user = data as PoolrUser;

        setPoolrUserId(user.id);
        setPoolrUser(user);
        setAccountReady(true);
      } catch (err) {
        console.error("Could not load Poolr account:", err);
        localStorage.removeItem("poolr_user_id");
        router.replace(`/account?returnTo=${encodeURIComponent(returnTo)}`);
      }
    }

    requirePoolrAccount();
  }, [router, returnTo]);

  async function loadBuildTeam() {
    if (!poolrUserId) return;

    setLoading(true);
    setError("");
    setNotice("");

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

      if (!loadedPool.tournament_id) {
        throw new Error(
          "This pool is missing a tournament_id. Create a new pool or connect this pool to the correct tournament in Supabase."
        );
      }

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", loadedPool.tournament_id)
        .maybeSingle();

      if (tournamentError) throw new Error(tournamentError.message);

      const loadedTournament = (tournamentData as Tournament | null) ?? null;
      setTournament(loadedTournament);

      let activeEntry: Entry | null = null;

      if (entryIdFromUrl) {
        const { data: entryData, error: entryError } = await supabase
          .from("entries")
          .select("*")
          .eq("id", entryIdFromUrl)
          .eq("pool_id", loadedPool.id)
          .maybeSingle();

        if (entryError) throw new Error(entryError.message);

        activeEntry = (entryData as Entry | null) ?? null;

        if (
          activeEntry?.poolr_user_id &&
          activeEntry.poolr_user_id !== poolrUserId
        ) {
          throw new Error("This team belongs to a different Poolr account.");
        }

        if (activeEntry && !activeEntry.poolr_user_id) {
          const { data: claimedEntry, error: claimError } = await supabase
            .from("entries")
            .update({ poolr_user_id: poolrUserId })
            .eq("id", activeEntry.id)
            .select("*")
            .maybeSingle();

          if (!claimError && claimedEntry) {
            activeEntry = claimedEntry as Entry;
          }
        }
      }

      if (!activeEntry) {
        const { data: existingEntries, error: existingError } = await supabase
          .from("entries")
          .select("*")
          .eq("pool_id", loadedPool.id)
          .eq("poolr_user_id", poolrUserId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (existingError) throw new Error(existingError.message);

        activeEntry = ((existingEntries ?? [])[0] as Entry | undefined) ?? null;
      }

      let existingPickIds: string[] = [];

      if (activeEntry) {
        setEntry(activeEntry);
        setTeamName(activeEntry.team_name || "My Poolr Team");

        if (typeof window !== "undefined") {
          localStorage.setItem(`poolr_entry_${loadedPool.id}`, activeEntry.id);
        }

        const { data: existingPicks, error: picksError } = await supabase
          .from("picks")
          .select("*")
          .eq("entry_id", activeEntry.id);

        if (picksError) throw new Error(picksError.message);

        existingPickIds = ((existingPicks ?? []) as Pick[]).map(
          (pick) => pick.golfer_id
        );
      } else {
        setEntry(null);
        setTeamName(
          poolrUser?.full_name
            ? `${poolrUser.full_name.split(" ")[0]}'s Team`
            : "My Poolr Team"
        );
      }

      const { data: priceRows, error: priceError } = await supabase
        .from("player_prices")
        .select("*")
        .eq("tournament_id", loadedPool.tournament_id);

      if (priceError) throw new Error(priceError.message);

      if (!priceRows || priceRows.length === 0) {
        throw new Error(
          `No player_prices found for this tournament. Tournament ID: ${loadedPool.tournament_id}. This pool is connected to a tournament, but that tournament does not have its golfer field loaded yet.`
        );
      }

      const rawGolfers = (priceRows as PlayerPrice[])
        .filter((row) => Boolean(row.id && row.tournament_id))
        .filter((row) => Boolean(row.player_name || row.name || row.golfer_id))
        .map((row, index, array) => buildGolferFromPrice(row, index, array.length));

      const finalGolfers = deDupePlayers(rawGolfers).sort(
        (a, b) => b.salary - a.salary || sortByFavorite(a, b)
      );

      if (finalGolfers.length === 0) {
        throw new Error(
          `Player prices exist, but no valid golfers could be displayed for tournament_id ${loadedPool.tournament_id}. Check player_name and golfer_id in Supabase.`
        );
      }

      const validGolferIds = new Set(finalGolfers.map((golfer) => golfer.id));

      setGolfers(finalGolfers);
      setSelected(existingPickIds.filter((id) => validGolferIds.has(id)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load team builder.");
      setGolfers([]);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accountReady || !poolrUserId || !poolId) return;
    loadBuildTeam();
  }, [accountReady, poolrUserId, poolId, entryIdFromUrl]);

  const isLocked = isPoolLocked(pool, tournament);

  const rosterSize = Number(pool?.roster_size ?? 6);
  const countedPlayers = Number(pool?.counted_players ?? 4);
  const salaryCap = Number(pool?.salary_cap ?? 50000);
  const format = String(pool?.format ?? "salary_cap").toLowerCase();
  const isSalaryCap = !format.includes("tier");

  const selectedGolfers = useMemo(() => {
    const selectedSet = new Set(selected);
    const players = golfers.filter((golfer) => selectedSet.has(golfer.id));

    if (!isSalaryCap) {
      return [...players].sort(
        (a, b) =>
          Number(a.tier) - Number(b.tier) ||
          getRankNumber(a) - getRankNumber(b) ||
          a.name.localeCompare(b.name)
      );
    }

    return players;
  }, [golfers, selected, isSalaryCap]);

  const tierSlots = useMemo(() => {
    const tiers = Array.from(
      new Set(
        golfers
          .map((golfer) => Number(golfer.tier))
          .filter((tier) => Number.isFinite(tier) && tier > 0)
      )
    ).sort((a, b) => a - b);

    return tiers.length > 0 ? tiers : [1, 2, 3, 4, 5, 6];
  }, [golfers]);

  const effectiveRosterSize = isSalaryCap ? rosterSize : tierSlots.length;

  const selectedTierCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const golfer of selectedGolfers) {
      const tier = Number(golfer.tier);
      if (!Number.isFinite(tier)) continue;
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
    }

    return counts;
  }, [selectedGolfers]);

  const missingTiers = useMemo(() => {
    if (isSalaryCap) return [];
    return tierSlots.filter((tier) => !selectedTierCounts.has(tier));
  }, [isSalaryCap, selectedTierCounts, tierSlots]);

  const duplicateTiers = useMemo(() => {
    if (isSalaryCap) return [];

    return Array.from(selectedTierCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([tier]) => tier);
  }, [isSalaryCap, selectedTierCounts]);

  const tierRosterComplete =
    !isSalaryCap &&
    selected.length === effectiveRosterSize &&
    missingTiers.length === 0 &&
    duplicateTiers.length === 0;

  const salaryUsed = selectedGolfers.reduce(
    (sum, golfer) => sum + Number(golfer.salary ?? 0),
    0
  );

  const salaryLeft = salaryCap - salaryUsed;

  const filteredGolfers = useMemo(() => {
    const term = searchSafe(search);

    let list = golfers.filter((golfer) => {
      if (!term) return true;
      return searchSafe(golfer.name).includes(term);
    });

    if (!isSalaryCap) {
      list = [...list].sort((a, b) => {
        if (sort === "salary") return b.salary - a.salary;
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "rank" || sort === "tier") {
          const tierDiff = Number(a.tier) - Number(b.tier);
          if (tierDiff !== 0) return tierDiff;
          return getRankNumber(a) - getRankNumber(b);
        }

        const tierDiff = Number(a.tier) - Number(b.tier);
        if (tierDiff !== 0) return tierDiff;
        return sortByFavorite(a, b);
      });

      return list;
    }

    if (sort === "favorite") {
      list = [...list].sort(sortByFavorite);
    }

    if (sort === "salary") {
      list = [...list].sort((a, b) => b.salary - a.salary);
    }

    if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "tier") {
      list = [...list].sort((a, b) => a.tier - b.tier || getRankNumber(a) - getRankNumber(b));
    }

    if (sort === "rank") {
      list = [...list].sort((a, b) => getRankNumber(a) - getRankNumber(b));
    }

    return list;
  }, [golfers, search, sort, isSalaryCap]);

  const rosterComplete = isSalaryCap
    ? selected.length === rosterSize
    : tierRosterComplete;

  const overSalaryCap = isSalaryCap && salaryUsed > salaryCap;
  const canSubmit = rosterComplete && !overSalaryCap && !isLocked && !saving;

  function toggleGolfer(golferId: string) {
    setError("");
    setNotice("");

    if (isLocked) {
      setError("This pool is locked. Teams can no longer be edited.");
      return;
    }

    const alreadySelected = selected.includes(golferId);

    if (alreadySelected) {
      setSelected((previous) => previous.filter((id) => id !== golferId));
      return;
    }

    const golfer = golfers.find((item) => item.id === golferId);

    if (!golfer) {
      setError("This golfer could not be found.");
      return;
    }

    if (!isSalaryCap) {
      const tierAlreadyFilled = selectedGolfers.some(
        (selectedGolfer) => Number(selectedGolfer.tier) === Number(golfer.tier)
      );

      if (tierAlreadyFilled) {
        setError(
          `Tier ${golfer.tier} is already filled. Tiered Draft requires exactly one golfer from each tier.`
        );
        return;
      }
    }

    if (selected.length >= effectiveRosterSize) {
      setError(
        isSalaryCap
          ? `You can only select ${rosterSize} golfers.`
          : `Tiered Draft requires exactly ${effectiveRosterSize} golfers — one from each tier.`
      );
      return;
    }

    setSelected((previous) => [...previous, golferId]);
  }

  async function markFreeExperienceUsed(activeEntryId: string, activePoolId: string) {
    if (!poolrUserId) return;

    const update: Record<string, unknown> = {
      has_used_free_pool_experience: true,
      last_pool_joined_at: new Date().toISOString(),
    };

    if (!poolrUser?.first_pool_id) {
      update.first_pool_id = activePoolId;
    }

    if (!poolrUser?.first_entry_id) {
      update.first_entry_id = activeEntryId;
    }

    const { data, error: updateError } = await supabase
      .from("poolr_users")
      .update(update)
      .eq("id", poolrUserId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.warn("Could not mark free Poolr experience used:", updateError.message);
      return;
    }

    if (data) {
      setPoolrUser(data as PoolrUser);
    }
  }

  async function ensureEntry() {
    if (!pool) throw new Error("Pool not loaded.");
    if (!poolrUserId) throw new Error("Create your Poolr account before submitting.");

    if (entry) return entry.id;

    const { data: newEntry, error: entryError } = await supabase
      .from("entries")
      .insert({
        pool_id: pool.id,
        poolr_user_id: poolrUserId,
        team_name: teamName.trim() || "My Poolr Team",
        submitted: false,
      })
      .select("*")
      .single();

    if (entryError || !newEntry) {
      throw new Error(entryError?.message || "Could not create entry.");
    }

    const created = newEntry as Entry;
    setEntry(created);

    if (typeof window !== "undefined") {
      localStorage.setItem(`poolr_entry_${pool.id}`, created.id);
    }

    await markFreeExperienceUsed(created.id, pool.id);

    return created.id;
  }

  async function insertPicksWithFallback(activeEntryId: string) {
    const rowsWithTimestamp = selected.map((golferId) => ({
      entry_id: activeEntryId,
      golfer_id: golferId,
      created_at: new Date().toISOString(),
    }));

    const firstAttempt = await supabase.from("picks").insert(rowsWithTimestamp);

    if (!firstAttempt.error) return;

    const rowsBasic = selected.map((golferId) => ({
      entry_id: activeEntryId,
      golfer_id: golferId,
    }));

    const secondAttempt = await supabase.from("picks").insert(rowsBasic);

    if (secondAttempt.error) {
      throw new Error(secondAttempt.error.message);
    }
  }

  async function submitTeam() {
    if (!pool) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (!poolrUserId) {
        router.replace(`/account?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      if (isLocked) {
        throw new Error("This pool is locked. Teams can no longer be submitted.");
      }

      if (isSalaryCap && selected.length !== rosterSize) {
        throw new Error(`Select exactly ${rosterSize} golfers.`);
      }

      if (!isSalaryCap) {
        if (duplicateTiers.length > 0) {
          throw new Error(
            `Tiered Draft requires exactly one golfer from each tier. Duplicate tier: ${duplicateTiers
              .map((tier) => `Tier ${tier}`)
              .join(", ")}.`
          );
        }

        if (!tierRosterComplete) {
          throw new Error(
            `Pick exactly one golfer from each tier. Missing: ${
              missingTiers.length > 0
                ? missingTiers.map((tier) => `Tier ${tier}`).join(", ")
                : "none"
            }.`
          );
        }
      }

      if (overSalaryCap) {
        throw new Error("Your team is over the salary cap.");
      }

      const activeEntryId = await ensureEntry();

      const { error: entryUpdateError } = await supabase
        .from("entries")
        .update({
          poolr_user_id: poolrUserId,
          team_name: teamName.trim() || "My Poolr Team",
          submitted: true,
        })
        .eq("id", activeEntryId);

      if (entryUpdateError) throw new Error(entryUpdateError.message);

      const { error: deleteError } = await supabase
        .from("picks")
        .delete()
        .eq("entry_id", activeEntryId);

      if (deleteError) throw new Error(deleteError.message);

      await insertPicksWithFallback(activeEntryId);
      await markFreeExperienceUsed(activeEntryId, pool.id);

      setNotice("Team submitted successfully.");
      router.push(`/pool/${pool.id}/leaderboard`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not submit team.");
      setSaving(false);
    }
  }

  if (!accountReady) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Account
            </p>
            <h1 className="mt-3 text-3xl font-black">Checking your account...</h1>
            <p className="mt-2 text-sm text-slate-400">
              You’ll be sent to account setup if this is your first time.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Team Builder
            </p>
            <h1 className="mt-3 text-3xl font-black">Loading exact tournament field...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Pulling golfers from player_prices for this pool’s tournament.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[34px] border border-red-400/20 bg-red-400/10 p-8">
          <h1 className="text-3xl font-black">Pool not found</h1>
          <p className="mt-3 text-red-100">
            {error || "This pool could not be loaded."}
          </p>

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
    <main className="min-h-screen bg-[#030712] pb-32 text-white xl:pb-0">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-14%] top-[-14%] h-[560px] w-[560px] rounded-full bg-emerald-500/16 blur-3xl" />
        <div className="absolute right-[-14%] top-[8%] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[28%] h-[560px] w-[560px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[42px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                  Build Your Poolr Team
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
                  {isSalaryCap ? "SALARY CAP" : "TIERED DRAFT"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                  EXACT FIELD
                </span>
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                {pool.name || "Poolr Pool"}
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                {tournament?.name ?? "Tournament"}{" "}
                {tournament?.location ? `• ${tournament.location}` : ""}
                {tournament?.course ? ` • ${tournament.course}` : ""} •{" "}
                {lockText(pool, tournament)}
              </p>

              {poolrUser && (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Signed in as {poolrUser.full_name} • {poolrUser.email}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/pool/${pool.id}`}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Pool Lobby
              </Link>

              <Link
                href={`/pool/${pool.id}/leaderboard`}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Leaderboard
              </Link>

              <button
                onClick={submitTeam}
                disabled={!canSubmit}
                className={cn(
                  "rounded-2xl px-5 py-3 text-sm font-black transition",
                  canSubmit
                    ? "bg-emerald-400 text-black hover:bg-emerald-300"
                    : "cursor-not-allowed bg-slate-600 text-slate-300"
                )}
              >
                {saving
                  ? "Saving..."
                  : isLocked
                  ? "Teams Locked"
                  : rosterComplete
                  ? "Submit Team"
                  : isSalaryCap
                  ? `Pick ${rosterSize - selected.length} More`
                  : missingTiers.length > 0
                  ? `Pick Tier ${missingTiers[0]}`
                  : `Pick ${effectiveRosterSize - selected.length} More`}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Selected" value={`${selected.length}/${effectiveRosterSize}`} good={rosterComplete} />
            <Stat label="Best Count" value={countedPlayers} />
            <Stat label="Salary Used" value={money(salaryUsed)} />
            <Stat
              label="Salary Left"
              value={isSalaryCap ? money(salaryLeft) : "—"}
              good={!overSalaryCap}
              warning={isSalaryCap && salaryLeft < salaryCap * 0.1 && salaryLeft >= 0}
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-white">Roster Rule</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {isSalaryCap
                    ? `Pick ${rosterSize} golfers. Your best ${countedPlayers} live scores count on the leaderboard. Picks lock when the tournament starts.`
                    : `Pick exactly 1 golfer from each tier. You must fill all ${effectiveRosterSize} tiers before submitting. Picks lock when the tournament starts.`}
                </p>

                {!isSalaryCap && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tierSlots.map((tier) => {
                      const filled = selectedTierCounts.has(tier);
                      const duplicate = duplicateTiers.includes(tier);

                      return (
                        <span
                          key={tier}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-black",
                            duplicate
                              ? "border-red-300/30 bg-red-400/10 text-red-200"
                              : filled
                                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                                : "border-white/10 bg-white/5 text-slate-400"
                          )}
                        >
                          Tier {tier} {duplicate ? "Duplicate" : filled ? "Filled" : "Open"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">
                {golfers.length} tournament golfers loaded
              </span>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            className={cn(
              "mt-5 rounded-2xl border p-4 text-sm font-bold",
              error
                ? "border-red-400/20 bg-red-400/10 text-red-200"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
            )}
          >
            {error || notice}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[410px_1fr]">
          <aside className="min-w-0 h-fit rounded-[38px] border border-white/10 bg-[#07111f]/90 p-5 shadow-2xl backdrop-blur-2xl xl:sticky xl:top-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Your Team
            </p>

            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              disabled={isLocked}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Team name"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search golfers"
              autoComplete="off"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
              placeholder="Search golfers"
            />

            {isSalaryCap && (
              <>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      salaryUsed > salaryCap ? "bg-red-400" : "bg-emerald-400"
                    )}
                    style={{
                      width: `${Math.min((salaryUsed / salaryCap) * 100, 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Salary Cap</span>
                  <span
                    className={cn(
                      "font-black",
                      overSalaryCap ? "text-red-300" : "text-emerald-300"
                    )}
                  >
                    {money(salaryUsed)} / {money(salaryCap)}
                  </span>
                </div>
              </>
            )}

            <div className="mt-5 space-y-3">
              {selectedGolfers.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-400">
                  Select golfers from the exact tournament field. Your roster will appear here.
                </p>
              ) : (
                selectedGolfers.map((golfer, index) => (
                  <button
                    key={golfer.id}
                    onClick={() => toggleGolfer(golfer.id)}
                    disabled={isLocked}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left transition hover:bg-red-400/10 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-white">
                            {index + 1}. {golfer.name}
                          </p>
                          <OddsBadge odds={golfer.win_odds} compact />
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Tournament Field
                          {golfer.datagolf_rank ? ` • DataGolf #${golfer.datagolf_rank}` : ""}
                          {golfer.tier ? ` • Tier ${golfer.tier}` : ""}
                        </p>
                      </div>

                      <p className="text-sm font-black text-emerald-300">
                        {money(golfer.salary)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={submitTeam}
              disabled={!canSubmit}
              className={cn(
                "mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition",
                canSubmit
                  ? "bg-emerald-400 text-black hover:bg-emerald-300"
                  : "cursor-not-allowed bg-slate-600 text-slate-300"
              )}
            >
              {saving
                ? "Saving..."
                : isLocked
                ? "Teams Locked"
                : !rosterComplete
                ? isSalaryCap
                  ? `Pick ${rosterSize - selected.length} More`
                  : missingTiers.length > 0
                    ? `Pick Tier ${missingTiers[0]}`
                    : `Pick ${effectiveRosterSize - selected.length} More`
                : overSalaryCap
                ? "Over Salary Cap"
                : "Submit Team"}
            </button>
          </aside>

          <section className="min-w-0 rounded-[38px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/40 md:w-auto md:min-w-64"
              >
                <option value="favorite" className="bg-[#07111f]">
                  {isSalaryCap ? "Sort by favorite to win" : "Sort by tier, favorite inside tier"}
                </option>
                <option value="rank" className="bg-[#07111f]">
                  Sort by DataGolf rank
                </option>
                <option value="salary" className="bg-[#07111f]">
                  Sort by Poolr salary
                </option>
                <option value="tier" className="bg-[#07111f]">
                  Sort by tier
                </option>
                <option value="name" className="bg-[#07111f]">
                  Sort by name
                </option>
              </select>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredGolfers.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
                  <p className="text-xl font-black text-white">
                    {search.trim()
                      ? "No golfers match your search."
                      : "No golfers found."}
                  </p>
                  {!search.trim() ? (
                    <p className="mt-2 text-sm text-slate-400">
                      This page only shows golfers from player_prices for this pool’s exact tournament_id.
                    </p>
                  ) : null}
                </div>
              ) : (
                filteredGolfers.map((golfer) => {
                  const isSelected = selected.includes(golfer.id);
                  const tierAlreadyFilled =
                    !isSalaryCap &&
                    !isSelected &&
                    selectedGolfers.some(
                      (selectedGolfer) =>
                        Number(selectedGolfer.tier) === Number(golfer.tier)
                    );

                  const rosterFull = !isSelected && selected.length >= effectiveRosterSize;
                  const disabled = isLocked || tierAlreadyFilled || rosterFull;

                  const wouldBeSalaryUsed = isSelected
                    ? salaryUsed
                    : salaryUsed + golfer.salary;

                  const wouldGoOver =
                    isSalaryCap && !isSelected && wouldBeSalaryUsed > salaryCap;

                  return (
                    <button
                      key={golfer.id}
                      onClick={() => toggleGolfer(golfer.id)}
                      disabled={disabled}
                      className={cn(
                        "rounded-3xl border p-5 text-left transition",
                        isSelected
                          ? "border-emerald-400/50 bg-emerald-400/[0.09]"
                          : "border-white/10 bg-black/20 hover:bg-white/[0.07]",
                        disabled && !isSelected && "cursor-not-allowed opacity-40",
                        tierAlreadyFilled && "border-yellow-400/30",
                        wouldGoOver && !isSelected && "border-yellow-400/25"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black text-white">{golfer.name}</p>
                            <OddsBadge odds={golfer.win_odds} />
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            Tournament Field
                            {golfer.datagolf_rank ? ` • DataGolf #${golfer.datagolf_rank}` : ""}
                            {golfer.tier ? ` • Tier ${golfer.tier}` : ""}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-black",
                            isSelected
                              ? "bg-emerald-400 text-black"
                              : "bg-white/10 text-slate-300"
                          )}
                        >
                          {isSelected ? "Picked" : "Add"}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <p className="text-sm text-slate-400">
                          {isSalaryCap ? "Poolr Salary" : "Tier"}
                        </p>

                        <p className="text-xl font-black text-emerald-300">
                          {isSalaryCap ? money(golfer.salary) : `Tier ${golfer.tier}`}
                        </p>
                      </div>

                      {tierAlreadyFilled && (
                        <p className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-100">
                          Tier {golfer.tier} is already filled. Remove your current Tier {golfer.tier} pick to choose this golfer.
                        </p>
                      )}

                      {wouldGoOver && !isSelected && (
                        <p className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-100">
                          Adding this golfer would put you over the salary cap.
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#030712]/92 px-3 py-3 shadow-[0_-24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.07] p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">
              {selected.length}/{effectiveRosterSize} golfers selected
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {isLocked
                ? "Teams are locked"
                : rosterComplete
                  ? "Roster complete — ready to submit"
                  : isSalaryCap
                    ? `Pick ${rosterSize - selected.length} more`
                    : missingTiers.length > 0
                      ? `Next: Tier ${missingTiers[0]}`
                      : `Pick ${effectiveRosterSize - selected.length} more`}
            </p>
          </div>

          <button
            onClick={submitTeam}
            disabled={!canSubmit}
            className={cn(
              "shrink-0 rounded-2xl px-5 py-3 text-sm font-black transition",
              canSubmit
                ? "bg-emerald-400 text-black hover:bg-emerald-300"
                : "cursor-not-allowed bg-slate-600 text-slate-300"
            )}
          >
            {saving
              ? "Saving..."
              : isLocked
              ? "Locked"
              : rosterComplete
              ? "Submit"
              : isSalaryCap
              ? `${rosterSize - selected.length} More`
              : missingTiers.length > 0
              ? `Tier ${missingTiers[0]}`
              : `${effectiveRosterSize - selected.length} More`}
          </button>
        </div>
      </div>
    </main>
  );
}

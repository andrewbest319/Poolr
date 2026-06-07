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
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  lock_time: string | null;
  status: string | null;
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

type Golfer = {
  id: string;
  name: string;
  salary: number | null;
  tier: number | null;
  country: string | null;
  world_rank: number | null;
  tournament_id: string | null;
  source?: "scores" | "golfers";
};

type ScorePlayer = {
  golfer_id: string | null;
  player_name: string | null;
  tournament_id: string | null;
};

type PlayerPrice = {
  golfer_id: string;
  tournament_id: string | null;
  salary: number | null;
  tier: number | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `$${Number(value).toLocaleString()}`;
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

function lockText(tournament: Tournament | null) {
  const status = String(tournament?.status ?? "").toLowerCase();

  if (status === "live") return "Tournament is live — teams are locked";
  if (status === "final") return "Tournament final — teams are locked";
  if (status === "locked") return "Teams are locked";
  if (!tournament?.lock_time) return "Lock time TBD";

  const lockTime = new Date(tournament.lock_time).getTime();

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

  return (
    status === "locked" ||
    status === "live" ||
    status === "final" ||
    (!!tournament?.lock_time && new Date() >= new Date(tournament.lock_time))
  );
}

function defaultSalary(index: number) {
  const starting = 11500;
  const step = 125;
  return Math.max(5500, starting - index * step);
}

function defaultTier(index: number) {
  return Math.min(6, Math.floor(index / 12) + 1);
}

function formatNameSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, "");
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
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
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
  const [sort, setSort] = useState<"salary" | "name" | "tier" | "rank">(
    "salary"
  );

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
      let { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .maybeSingle();

      if (!poolData) {
        const fallback = await supabase
          .from("pools")
          .select("*")
          .eq("tournament_id", poolId)
          .maybeSingle();

        poolData = fallback.data;
        poolError = fallback.error;
      }

      if (poolError) throw new Error(poolError.message);

      if (!poolData) {
        setPool(null);
        setError("Pool not found.");
        return;
      }

      const loadedPool = poolData as Pool;
      setPool(loadedPool);

      let loadedTournament: Tournament | null = null;

      if (loadedPool.tournament_id) {
        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", loadedPool.tournament_id)
          .maybeSingle();

        if (tournamentError) throw new Error(tournamentError.message);

        loadedTournament = (tournamentData as Tournament | null) ?? null;
        setTournament(loadedTournament);
      }

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

        setSelected(((existingPicks ?? []) as Pick[]).map((pick) => pick.golfer_id));
      } else {
        setEntry(null);
        setSelected([]);
        setTeamName(
          poolrUser?.full_name
            ? `${poolrUser.full_name.split(" ")[0]}'s Team`
            : "My Poolr Team"
        );
      }

      const priceMap = new Map<string, PlayerPrice>();

      if (loadedPool.tournament_id) {
        const { data: priceData } = await supabase
          .from("player_prices")
          .select("golfer_id, tournament_id, salary, tier")
          .eq("tournament_id", loadedPool.tournament_id);

        for (const price of (priceData ?? []) as PlayerPrice[]) {
          if (price.golfer_id) priceMap.set(price.golfer_id, price);
        }
      }

      const scoreGolfers: Golfer[] = [];

      if (loadedPool.tournament_id) {
        const { data: scorePlayers } = await supabase
          .from("scores")
          .select("golfer_id, player_name, tournament_id")
          .eq("tournament_id", loadedPool.tournament_id);

        const seen = new Set<string>();

        for (const row of (scorePlayers ?? []) as ScorePlayer[]) {
          if (!row.golfer_id || !row.player_name) continue;

          const key = row.golfer_id || normalizeName(row.player_name);
          if (seen.has(key)) continue;

          seen.add(key);

          const price = priceMap.get(row.golfer_id);

          scoreGolfers.push({
            id: row.golfer_id,
            name: displayNameFromScore(row.player_name),
            salary: price?.salary ?? null,
            tier: price?.tier ?? null,
            country: null,
            world_rank: null,
            tournament_id: row.tournament_id,
            source: "scores",
          });
        }
      }

      const { data: golferRows } = await supabase
        .from("golfers")
        .select("id, name, salary, tier, country, world_rank, tournament_id");

      const allGolfers = (golferRows ?? []) as Golfer[];

      const tournamentGolfers = allGolfers.filter((golfer) => {
        if (!loadedPool.tournament_id) return true;
        return !golfer.tournament_id || golfer.tournament_id === loadedPool.tournament_id;
      });

      // If this tournament does not have an imported field yet, fall back to the global golfer board
      // so the Build Team page never opens empty.
      const hasTournamentSpecificGolfers =
        tournamentGolfers.length > 0 || scoreGolfers.length > 0;

      const fallbackGolfers = hasTournamentSpecificGolfers
        ? tournamentGolfers
        : allGolfers;

      const combined = new Map<string, Golfer>();

      fallbackGolfers.forEach((golfer, index) => {
        const price = priceMap.get(golfer.id);

        combined.set(golfer.id, {
          ...golfer,
          salary: price?.salary ?? golfer.salary ?? defaultSalary(index),
          tier: price?.tier ?? golfer.tier ?? defaultTier(index),
          source: "golfers",
        });
      });

      scoreGolfers.forEach((golfer, index) => {
        const existing = combined.get(golfer.id);
        const price = priceMap.get(golfer.id);

        combined.set(golfer.id, {
          ...existing,
          ...golfer,
          salary:
            price?.salary ??
            golfer.salary ??
            existing?.salary ??
            defaultSalary(index),
          tier: price?.tier ?? golfer.tier ?? existing?.tier ?? defaultTier(index),
          country: existing?.country ?? golfer.country ?? null,
          world_rank: existing?.world_rank ?? golfer.world_rank ?? null,
        });
      });

      const finalGolfers = Array.from(combined.values()).sort((a, b) => {
        const salaryA = Number(a.salary ?? 0);
        const salaryB = Number(b.salary ?? 0);
        return salaryB - salaryA;
      });

      setGolfers(finalGolfers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load team builder.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accountReady || !poolrUserId || !poolId) return;
    loadBuildTeam();
  }, [accountReady, poolrUserId, poolId, entryIdFromUrl]);

  const isLocked = isTournamentLocked(tournament);

  const rosterSize = Number(pool?.roster_size ?? 6);
  const countedPlayers = Number(pool?.counted_players ?? 4);
  const salaryCap = Number(pool?.salary_cap ?? 50000);
  const format = String(pool?.format ?? "salary_cap").toLowerCase();
  const isSalaryCap = !format.includes("tier");

  const pricedGolfers = useMemo(() => {
    return golfers.map((golfer, index) => ({
      ...golfer,
      poolrSalary: Number(golfer.salary ?? defaultSalary(index)),
      poolrTier: Number(golfer.tier ?? defaultTier(index)),
    }));
  }, [golfers]);

  const selectedGolfers = useMemo(() => {
    const selectedSet = new Set(selected);
    return pricedGolfers.filter((golfer) => selectedSet.has(golfer.id));
  }, [pricedGolfers, selected]);

  const salaryUsed = selectedGolfers.reduce(
    (sum, golfer) => sum + Number(golfer.poolrSalary ?? 0),
    0
  );

  const salaryLeft = salaryCap - salaryUsed;

  const filteredGolfers = useMemo(() => {
    const term = formatNameSearch(search);

    let list = pricedGolfers.filter((golfer) => {
      const haystack = formatNameSearch(
        `${golfer.name} ${golfer.country ?? ""} ${golfer.poolrTier ?? ""}`
      );

      return haystack.includes(term);
    });

    if (sort === "salary") {
      list = [...list].sort((a, b) => b.poolrSalary - a.poolrSalary);
    }

    if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "tier") {
      list = [...list].sort((a, b) => a.poolrTier - b.poolrTier);
    }

    if (sort === "rank") {
      list = [...list].sort(
        (a, b) => Number(a.world_rank ?? 9999) - Number(b.world_rank ?? 9999)
      );
    }

    return list;
  }, [pricedGolfers, search, sort]);

  const rosterComplete = selected.length === rosterSize;
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

    if (selected.length >= rosterSize) {
      setError(`You can only select ${rosterSize} golfers.`);
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

      if (selected.length !== rosterSize) {
        throw new Error(`Select exactly ${rosterSize} golfers.`);
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
      <main className="min-h-screen bg-[#040816] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
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
      <main className="min-h-screen bg-[#040816] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Team Builder
            </p>
            <h1 className="mt-3 text-3xl font-black">Loading team builder...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Pulling pool rules, field, pricing, and your entry.
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
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-[-12%] top-[8%] h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_130px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
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
                  ACCOUNT LINKED
                </span>
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                {pool.name || "Poolr Pool"}
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                {tournament?.name ?? "Tournament"}{" "}
                {tournament?.location ? `• ${tournament.location}` : ""} •{" "}
                {lockText(tournament)}
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
                  : `Pick ${rosterSize - selected.length} More`}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Selected" value={`${selected.length}/${rosterSize}`} good={rosterComplete} />
            <Stat label="Best Count" value={countedPlayers} />
            <Stat label="Salary Used" value={money(salaryUsed)} />
            <Stat
              label="Salary Left"
              value={isSalaryCap ? money(salaryLeft) : "—"}
              good={!overSalaryCap}
              warning={isSalaryCap && salaryLeft < salaryCap * 0.1 && salaryLeft >= 0}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-white">Roster Rule</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Pick {rosterSize} golfers. Your best {countedPlayers} live scores count on
                  the leaderboard. Picks lock when the tournament starts.
                </p>
              </div>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">
                {selectedGolfers.length} selected
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
          <aside className="h-fit rounded-[36px] border border-white/10 bg-[#07111f]/90 p-5 shadow-2xl backdrop-blur-2xl xl:sticky xl:top-6">
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
                  Select golfers from the tournament field. Your roster will appear here.
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
                        <p className="text-sm font-black text-white">
                          {index + 1}. {golfer.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {golfer.country ?? "DataGolf"}
                          {golfer.poolrTier ? ` • Tier ${golfer.poolrTier}` : ""}
                        </p>
                      </div>

                      <p className="text-sm font-black text-emerald-300">
                        {money(golfer.poolrSalary)}
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
                ? `Pick ${rosterSize - selected.length} More`
                : overSalaryCap
                ? "Over Salary Cap"
                : "Submit Team"}
            </button>
          </aside>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40 md:max-w-sm"
                placeholder="Search golfers..."
              />

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/40"
              >
                <option value="salary" className="bg-[#07111f]">
                  Sort by Poolr salary
                </option>
                <option value="name" className="bg-[#07111f]">
                  Sort by name
                </option>
                <option value="tier" className="bg-[#07111f]">
                  Sort by tier
                </option>
                <option value="rank" className="bg-[#07111f]">
                  Sort by world rank
                </option>
              </select>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredGolfers.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
                  <p className="text-xl font-black text-white">No golfers found.</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Check your scores, golfers, or player_prices data for this tournament.
                  </p>
                </div>
              ) : (
                filteredGolfers.map((golfer) => {
                  const isSelected = selected.includes(golfer.id);
                  const disabled =
                    isLocked || (!isSelected && selected.length >= rosterSize);

                  const wouldBeSalaryUsed = isSelected
                    ? salaryUsed
                    : salaryUsed + golfer.poolrSalary;

                  const wouldGoOver =
                    isSalaryCap && !isSelected && wouldBeSalaryUsed > salaryCap;

                  const sourceLabel =
                    golfer.country ??
                    (golfer.source === "scores" ? "DataGolf" : "Field");

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
                        wouldGoOver && !isSelected && "border-yellow-400/25"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-black text-white">{golfer.name}</p>

                          <p className="mt-1 text-xs text-slate-500">
                            {sourceLabel}
                            {golfer.world_rank ? ` • World #${golfer.world_rank}` : ""}
                            {golfer.poolrTier ? ` • Tier ${golfer.poolrTier}` : ""}
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
                          {isSalaryCap
                            ? money(golfer.poolrSalary)
                            : `Tier ${golfer.poolrTier}`}
                        </p>
                      </div>

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
    </main>
  );
}
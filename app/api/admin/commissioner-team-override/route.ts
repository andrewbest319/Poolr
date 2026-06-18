export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  normalizeEmail,
  requireCommissionerAdmin,
} from "@/lib/adminAccess";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PoolRow = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  roster_size: number | string | null;
  counted_players?: number | string | null;
  salary_cap: number | string | null;
  format: string | null;
};

type TournamentRow = {
  id: string;
  name: string | null;
  status?: string | null;
};

type PoolrUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  email_normalized?: string | null;
};

type EntryRow = {
  id: string;
  pool_id: string;
  user_id?: string | null;
  poolr_user_id?: string | null;
  team_name?: string | null;
  submitted?: boolean | null;
  created_at?: string | null;
};

type PickRow = {
  id?: string;
  entry_id: string;
  golfer_id: string | null;
};

type PlayerPriceRow = {
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
};

type AdminGolfer = {
  id: string;
  player_price_id: string;
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
};

type LoadedContext = {
  pool: PoolRow;
  tournament: TournamentRow;
  golfers: AdminGolfer[];
  isSalaryCap: boolean;
  rosterSize: number;
  salaryCap: number;
  tierSlots: number[];
  effectiveRosterSize: number;
};

type ValidationResult =
  | {
      ok: true;
      selectedGolfers: AdminGolfer[];
      salaryUsed: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function errorStatus(err: unknown) {
  return err instanceof ApiError ? err.status : 500;
}

function errorJson(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const cleaned = String(value)
    .trim()
    .replace("+", "")
    .replace(",", "")
    .replace("$", "");
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function cleanName(value: unknown) {
  const raw = cleanString(value);

  if (!raw) return "";

  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return `${first} ${last}`.replace(/\s+/g, " ").trim();
  }

  return raw.replace(/\s+/g, " ").trim();
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

function getOddsRaw(row: PlayerPriceRow) {
  return (
    row.win_odds ??
    row.odds ??
    row.american_odds ??
    row.outright_odds ??
    row.odds_to_win ??
    row.dg_win_odds ??
    null
  );
}

function getRankNumber(row: PlayerPriceRow | AdminGolfer) {
  return (
    cleanNumber(row.datagolf_rank) ??
    cleanNumber(row.world_rank) ??
    ("rank" in row ? cleanNumber(row.rank) : null) ??
    9999
  );
}

function sortByFavorite(a: AdminGolfer, b: AdminGolfer) {
  const aOdds = cleanNumber(a.win_odds);
  const bOdds = cleanNumber(b.win_odds);

  if (aOdds !== null && bOdds !== null) return aOdds - bOdds;
  if (aOdds !== null) return -1;
  if (bOdds !== null) return 1;

  const rankDiff = getRankNumber(a) - getRankNumber(b);
  if (rankDiff !== 0) return rankDiff;

  if (a.salary !== b.salary) return b.salary - a.salary;

  return a.name.localeCompare(b.name);
}

function buildGolferFromPrice(
  row: PlayerPriceRow,
  index: number,
  fieldSize: number
): AdminGolfer {
  const rank = getRankNumber(row);

  return {
    id: row.golfer_id || row.id,
    player_price_id: row.id,
    name: cleanName(row.player_name || row.name || "Unknown Golfer"),
    salary:
      cleanNumber(row.salary) ?? cleanNumber(row.price) ?? defaultSalary(index),
    tier: cleanNumber(row.tier) ?? defaultTier(index, fieldSize),
    win_odds: getOddsRaw(row),
    top_5_odds: row.top_5_odds ?? null,
    top_10_odds: row.top_10_odds ?? null,
    country: row.country ?? null,
    datagolf_rank: rank === 9999 ? null : rank,
    world_rank: cleanNumber(row.world_rank),
    tournament_id: row.tournament_id,
  };
}

function deDupePlayers(players: AdminGolfer[]) {
  const seen = new Set<string>();

  return players.filter((player) => {
    const key = `${player.id}-${player.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function isSalaryCapFormat(format: string | null | undefined) {
  return !String(format ?? "salary_cap")
    .toLowerCase()
    .includes("tier");
}

function getTierSlots(golfers: AdminGolfer[]) {
  const tiers = Array.from(
    new Set(
      golfers
        .map((golfer) => Number(golfer.tier))
        .filter((tier) => Number.isFinite(tier) && tier > 0)
    )
  ).sort((a, b) => a - b);

  return tiers.length > 0 ? tiers : [1, 2, 3, 4, 5, 6];
}

async function findPoolrUserByEmail(email: string) {
  const normalized = normalizeEmail(email);

  if (!normalized) return null;

  const normalizedResult = await supabaseAdmin
    .from("poolr_users")
    .select("id, full_name, email, email_normalized")
    .eq("email_normalized", normalized)
    .maybeSingle();

  if (normalizedResult.error) {
    throw new Error(normalizedResult.error.message);
  }

  if (normalizedResult.data) {
    return normalizedResult.data as PoolrUserRow;
  }

  const emailResult = await supabaseAdmin
    .from("poolr_users")
    .select("id, full_name, email, email_normalized")
    .ilike("email", normalized)
    .limit(2);

  if (emailResult.error) throw new Error(emailResult.error.message);

  const matches = (emailResult.data ?? []) as PoolrUserRow[];

  if (matches.length > 1) {
    throw new ApiError(`Multiple Poolr users matched ${email}.`, 409);
  }

  return matches[0] ?? null;
}

async function loadContext(poolId: string): Promise<LoadedContext> {
  const { data: poolData, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .maybeSingle();

  if (poolError) throw new Error(poolError.message);
  if (!poolData) throw new ApiError("Pool not found.", 404);

  const pool = poolData as PoolRow;

  if (!pool.tournament_id) {
    throw new ApiError("This pool does not have a tournament attached.", 400);
  }

  const { data: tournamentData, error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .select("*")
    .eq("id", pool.tournament_id)
    .maybeSingle();

  if (tournamentError) throw new Error(tournamentError.message);
  if (!tournamentData) throw new ApiError("Tournament not found.", 404);

  const { data: priceRows, error: priceError } = await supabaseAdmin
    .from("player_prices")
    .select("*")
    .eq("tournament_id", pool.tournament_id);

  if (priceError) throw new Error(priceError.message);

  if (!priceRows || priceRows.length === 0) {
    throw new ApiError(
      `No player_prices found for tournament ${pool.tournament_id}.`,
      400
    );
  }

  const rawGolfers = (priceRows as PlayerPriceRow[])
    .filter((row) => Boolean(row.id && row.tournament_id))
    .filter((row) => Boolean(row.player_name || row.name || row.golfer_id))
    .map((row, index, array) =>
      buildGolferFromPrice(row, index, array.length)
    );
  const golfers = deDupePlayers(rawGolfers).sort(
    (a, b) => b.salary - a.salary || sortByFavorite(a, b)
  );

  if (golfers.length === 0) {
    throw new ApiError(
      `Player prices exist, but no valid golfers could be displayed for tournament ${pool.tournament_id}.`,
      400
    );
  }

  const isSalaryCap = isSalaryCapFormat(pool.format);
  const rosterSize = Math.max(1, cleanNumber(pool.roster_size) ?? 6);
  const salaryCap = cleanNumber(pool.salary_cap) ?? 50000;
  const tierSlots = getTierSlots(golfers);
  const effectiveRosterSize = isSalaryCap ? rosterSize : tierSlots.length;

  return {
    pool,
    tournament: tournamentData as TournamentRow,
    golfers,
    isSalaryCap,
    rosterSize,
    salaryCap,
    tierSlots,
    effectiveRosterSize,
  };
}

function validateSelection(
  context: LoadedContext,
  rawGolferIds: unknown
): ValidationResult {
  const rawIds = Array.isArray(rawGolferIds)
    ? rawGolferIds.map(cleanString).filter(Boolean)
    : [];
  const selectedIds = Array.from(new Set(rawIds));

  if (selectedIds.length !== rawIds.length) {
    return {
      ok: false,
      status: 400,
      error: "Duplicate golfers selected.",
    };
  }

  if (selectedIds.length !== context.effectiveRosterSize) {
    return {
      ok: false,
      status: 400,
      error: context.isSalaryCap
        ? `Select exactly ${context.rosterSize} golfers.`
        : `Tiered Draft requires exactly ${context.effectiveRosterSize} golfers, one from each tier.`,
    };
  }

  const golferById = new Map(
    context.golfers.map((golfer) => [golfer.id, golfer])
  );
  const missingIds = selectedIds.filter((id) => !golferById.has(id));

  if (missingIds.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `Golfer is not valid for this tournament: ${missingIds.join(", ")}.`,
    };
  }

  const selectedGolfers = selectedIds
    .map((id) => golferById.get(id))
    .filter(Boolean) as AdminGolfer[];
  const salaryUsed = selectedGolfers.reduce(
    (sum, golfer) => sum + Number(golfer.salary ?? 0),
    0
  );

  if (context.isSalaryCap && salaryUsed > context.salaryCap) {
    return {
      ok: false,
      status: 400,
      error: "Selected team is over the salary cap.",
    };
  }

  if (!context.isSalaryCap) {
    const tierCounts = new Map<number, number>();

    for (const golfer of selectedGolfers) {
      const tier = Number(golfer.tier);
      if (!Number.isFinite(tier)) continue;
      tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
    }

    const missingTiers = context.tierSlots.filter(
      (tier) => !tierCounts.has(tier)
    );
    const duplicateTiers = Array.from(tierCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([tier]) => tier);

    if (duplicateTiers.length > 0) {
      return {
        ok: false,
        status: 400,
        error: `Tiered Draft requires exactly one golfer from each tier. Duplicate tier: ${duplicateTiers
          .map((tier) => `Tier ${tier}`)
          .join(", ")}.`,
      };
    }

    if (missingTiers.length > 0) {
      return {
        ok: false,
        status: 400,
        error: `Pick exactly one golfer from each tier. Missing: ${missingTiers
          .map((tier) => `Tier ${tier}`)
          .join(", ")}.`,
      };
    }
  }

  return { ok: true, selectedGolfers, salaryUsed };
}

async function findExistingEntries(poolId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("entries")
    .select("*")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as EntryRow[]).filter(
    (entry) => entry.poolr_user_id === userId || entry.user_id === userId
  );
}

async function loadExistingPicks(entryId: string) {
  const { data, error } = await supabaseAdmin
    .from("picks")
    .select("*")
    .eq("entry_id", entryId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as PickRow[])
    .map((pick) => pick.golfer_id)
    .filter((golferId): golferId is string => Boolean(golferId));
}

async function insertPicksWithFallback(entryId: string, golferIds: string[]) {
  const timestamp = new Date().toISOString();
  const rowsWithTimestamp = golferIds.map((golferId) => ({
    entry_id: entryId,
    golfer_id: golferId,
    created_at: timestamp,
  }));

  const firstAttempt = await supabaseAdmin.from("picks").insert(rowsWithTimestamp);

  if (!firstAttempt.error) return;

  const rowsBasic = golferIds.map((golferId) => ({
    entry_id: entryId,
    golfer_id: golferId,
  }));
  const secondAttempt = await supabaseAdmin.from("picks").insert(rowsBasic);

  if (secondAttempt.error) {
    throw new Error(secondAttempt.error.message);
  }
}

export async function GET(req: Request) {
  try {
    const adminCheck = await requireCommissionerAdmin(req);

    if (!adminCheck.ok) {
      return errorJson(adminCheck.error, adminCheck.status);
    }

    const { searchParams } = new URL(req.url);
    const poolId = cleanString(searchParams.get("poolId"));
    const targetEmail = cleanString(searchParams.get("targetEmail"));

    if (!poolId) {
      return NextResponse.json({ ok: true, admin: adminCheck.admin });
    }

    const context = await loadContext(poolId);
    let targetUser: PoolrUserRow | null = null;
    let existingEntry: EntryRow | null = null;
    let selectedGolferIds: string[] = [];

    if (targetEmail) {
      targetUser = await findPoolrUserByEmail(targetEmail);

      if (!targetUser) {
        return errorJson("Target user not found.", 404);
      }

      const entries = await findExistingEntries(context.pool.id, targetUser.id);

      if (entries.length > 1) {
        return errorJson(
          "Multiple entries already exist for this user in this pool. Resolve duplicates before overriding.",
          409
        );
      }

      existingEntry = entries[0] ?? null;

      if (existingEntry) {
        selectedGolferIds = await loadExistingPicks(existingEntry.id);
      }
    }

    return NextResponse.json({
      ok: true,
      admin: adminCheck.admin,
      pool: context.pool,
      tournament: context.tournament,
      golfers: context.golfers,
      rules: {
        isSalaryCap: context.isSalaryCap,
        rosterSize: context.rosterSize,
        salaryCap: context.salaryCap,
        tierSlots: context.tierSlots,
        effectiveRosterSize: context.effectiveRosterSize,
      },
      targetUser,
      existingEntry,
      selectedGolferIds,
    });
  } catch (err: unknown) {
    return errorJson(
      err instanceof Error ? err.message : "Could not load override data.",
      errorStatus(err)
    );
  }
}

export async function POST(req: Request) {
  try {
    const adminCheck = await requireCommissionerAdmin(req);

    if (!adminCheck.ok) {
      return errorJson(adminCheck.error, adminCheck.status);
    }

    const body = await req.json().catch(() => ({}));
    const poolId = cleanString(body?.poolId);
    const targetEmail = cleanString(body?.targetUserEmail);

    if (!poolId) return errorJson("Missing pool ID.");
    if (!targetEmail) return errorJson("Missing target user email.");

    const targetUser = await findPoolrUserByEmail(targetEmail);

    if (!targetUser) {
      return errorJson("Target user does not exist.", 404);
    }

    const context = await loadContext(poolId);
    const validation = validateSelection(context, body?.selectedGolferIds);

    if (!validation.ok) {
      return errorJson(validation.error, validation.status);
    }

    const entries = await findExistingEntries(context.pool.id, targetUser.id);

    if (entries.length > 1) {
      return errorJson(
        "Multiple entries already exist for this user in this pool. Resolve duplicates before overriding.",
        409
      );
    }

    const fallbackName = targetUser.full_name
      ? `${targetUser.full_name.split(" ")[0]}'s Team`
      : "Commissioner Override Team";
    const teamName = cleanString(body?.teamName) || fallbackName;
    let entry = entries[0] ?? null;

    if (!entry) {
      const { data: insertedEntry, error: insertError } = await supabaseAdmin
        .from("entries")
        .insert({
          pool_id: context.pool.id,
          poolr_user_id: targetUser.id,
          team_name: teamName,
          submitted: true,
        })
        .select("*")
        .single();

      if (insertError || !insertedEntry) {
        throw new Error(insertError?.message || "Could not create entry.");
      }

      entry = insertedEntry as EntryRow;
    } else {
      const { data: updatedEntry, error: updateError } = await supabaseAdmin
        .from("entries")
        .update({
          poolr_user_id: targetUser.id,
          team_name: teamName,
          submitted: true,
        })
        .eq("id", entry.id)
        .select("*")
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);

      entry = (updatedEntry as EntryRow | null) ?? entry;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("picks")
      .delete()
      .eq("entry_id", entry.id);

    if (deleteError) throw new Error(deleteError.message);

    const selectedGolferIds = validation.selectedGolfers.map(
      (golfer) => golfer.id
    );

    await insertPicksWithFallback(entry.id, selectedGolferIds);

    console.info("Commissioner team override saved", {
      adminEmail: adminCheck.admin.email,
      targetEmail: normalizeEmail(targetEmail),
      poolId: context.pool.id,
      selectedGolferIds,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      entryId: entry.id,
      teamName,
      targetUser,
      pool: context.pool,
      tournament: context.tournament,
      selectedGolferIds,
      salaryUsed: validation.salaryUsed,
      selectedCount: selectedGolferIds.length,
    });
  } catch (err: unknown) {
    return errorJson(
      err instanceof Error ? err.message : "Could not save commissioner override.",
      errorStatus(err)
    );
  }
}

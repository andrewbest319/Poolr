export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TournamentRow = {
  id: string;
  name: string | null;
  slug?: string | null;
  tour?: string | null;
};

type ExistingPlayerPrice = {
  id: string;
  tournament_id: string;
  golfer_id: string | null;
  player_name: string | null;
};

type FieldPlayer = {
  player_name: string;
  normalized_name: string;
  datagolf_rank: number | null;
  sort_rank: number;
  salary: number;
  tier: number;
};

const COMMON_EVENT_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "of",
  "at",
  "by",
  "presented",
  "presentedby",
  "sponsored",
  "sponsoredby",
  "open",
  "championship",
  "classic",
  "invitational",
  "tournament",
  "pga",
  "tour",
  "golf",
]);

function cleanName(name: string) {
  if (!name) return "";

  if (name.includes(",")) {
    const [last, first] = name.split(",").map((x) => x.trim());
    return `${first} ${last}`.trim();
  }

  return name.trim();
}

function normalizeName(name: string | null | undefined) {
  return cleanName(String(name ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeEventName(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function eventWords(value: string | null | undefined) {
  return normalizeEventName(value)
    .split(" ")
    .filter(Boolean)
    .filter((word) => !COMMON_EVENT_WORDS.has(word));
}

function hasUSOpen(value: string | null | undefined) {
  const normalized = normalizeEventName(value);
  return normalized.includes("u s open") || normalized.includes("us open");
}

function salaryFromRank(rank: number) {
  return Math.max(6000, Math.round(12200 - rank * 85));
}

function tierFromRank(rank: number) {
  return Math.min(8, Math.max(1, Math.ceil(rank / 12)));
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(String(value).replace("+", "").replace(",", "").trim());

  return Number.isFinite(n) ? n : null;
}

function getPlayerName(player: any) {
  return cleanName(
    player?.player_name ||
      player?.name ||
      player?.player ||
      player?.golfer_name ||
      player?.dg_name ||
      player?.display_name ||
      ""
  );
}

function extractEventName(raw: any) {
  return String(
    raw?.event_name ||
      raw?.event ||
      raw?.tournament_name ||
      raw?.tournament ||
      raw?.course_name ||
      raw?.field?.event_name ||
      ""
  );
}

function eventLooksLikeMatch(tournament: TournamentRow, dataGolfEventRaw: string) {
  const expectedName = normalizeEventName(tournament.name);
  const expectedSlug = normalizeEventName(tournament.slug);
  const dataGolfEvent = normalizeEventName(dataGolfEventRaw);

  if (!dataGolfEvent) {
    return {
      ok: false,
      reason:
        "DataGolf did not return an event name, so Poolr refused to import safely.",
    };
  }

  const expectedRaw = `${tournament.name ?? ""} ${tournament.slug ?? ""}`;

  if (hasUSOpen(expectedRaw)) {
    const ok = hasUSOpen(dataGolfEventRaw);

    return {
      ok,
      reason: ok
        ? "U.S. Open matched"
        : `DataGolf event "${dataGolfEventRaw}" is not the U.S. Open.`,
    };
  }

  if (expectedName && dataGolfEvent.includes(expectedName)) {
    return { ok: true, reason: "event name matched" };
  }

  if (expectedSlug && dataGolfEvent.includes(expectedSlug)) {
    return { ok: true, reason: "event slug matched" };
  }

  const importantWords = eventWords(tournament.name);

  if (importantWords.length >= 2) {
    const matchedWords = importantWords.filter((word) =>
      dataGolfEvent.includes(word)
    );

    if (matchedWords.length >= 2 && matchedWords.length === importantWords.length) {
      return { ok: true, reason: "important event words matched" };
    }
  }

  return {
    ok: false,
    reason: `DataGolf event "${dataGolfEventRaw}" does not match Poolr tournament "${tournament.name}".`,
  };
}

function extractArrayFromObject(raw: any, preferredKeys: string[]) {
  for (const key of preferredKeys) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }

  if (Array.isArray(raw)) return raw;

  if (raw && typeof raw === "object") {
    for (const value of Object.values(raw)) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object"
      ) {
        return value;
      }
    }
  }

  return [];
}

function extractPlayersFromFieldUpdates(raw: any) {
  return extractArrayFromObject(raw, [
    "field",
    "players",
    "data",
    "field_updates",
    "field_list",
    "tournament_field",
  ]);
}

function extractPlayersFromRankings(raw: any) {
  return extractArrayFromObject(raw, [
    "rankings",
    "data",
    "players",
    "dg_rankings",
    "datagolf_rankings",
  ]);
}

function getRankFromRankingRow(row: any, fallbackRank: number) {
  return (
    numberOrNull(row?.dg_rank) ??
    numberOrNull(row?.datagolf_rank) ??
    numberOrNull(row?.data_golf_rank) ??
    numberOrNull(row?.rank) ??
    numberOrNull(row?.ranking) ??
    numberOrNull(row?.position) ??
    fallbackRank
  );
}

function dataGolfTourFromPoolrTour(value: string | null | undefined) {
  const tour = String(value ?? "").toLowerCase();

  if (tour.includes("liv")) return "alt";
  if (tour.includes("euro") || tour.includes("dp")) return "euro";
  if (tour.includes("kft") || tour.includes("korn")) return "kft";
  if (tour.includes("opp")) return "opp";
  if (tour.includes("alt")) return "alt";

  return "pga";
}

function buildToursToTry(tournament: TournamentRow, explicitTour: string | null) {
  const tours = new Set<string>();

  if (explicitTour) {
    tours.add(explicitTour);
  }

  const mappedTour = dataGolfTourFromPoolrTour(tournament.tour);

  if (mappedTour === "pga") {
    tours.add("upcoming_pga");
    tours.add("pga");
  } else {
    tours.add(mappedTour);
  }

  tours.add("upcoming_pga");
  tours.add("pga");

  return Array.from(tours);
}

async function fetchDataGolfField(apiKey: string, tour: string) {
  const url =
    `https://feeds.datagolf.com/field-updates` +
    `?tour=${encodeURIComponent(tour)}` +
    `&file_format=json` +
    `&key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();

    return {
      ok: false,
      tour,
      status: res.status,
      error: text,
      raw: null,
      players: [],
      eventName: "",
    };
  }

  const raw = await res.json();
  const players = extractPlayersFromFieldUpdates(raw);
  const eventName = extractEventName(raw);

  return {
    ok: true,
    tour,
    status: res.status,
    error: null,
    raw,
    players,
    eventName,
  };
}

async function fetchDataGolfRankings(apiKey: string) {
  const url =
    `https://feeds.datagolf.com/preds/get-dg-rankings` +
    `?file_format=json` +
    `&key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();

    return {
      ok: false,
      status: res.status,
      error: text,
      rows: [] as any[],
      raw: null,
    };
  }

  const raw = await res.json();
  const rows = extractPlayersFromRankings(raw);

  return {
    ok: true,
    status: res.status,
    error: null,
    rows,
    raw,
  };
}

function buildRankingMap(rankingRows: any[]) {
  const map = new Map<string, number>();

  rankingRows.forEach((row, index) => {
    const name = getPlayerName(row);
    const key = normalizeName(name);

    if (!key) return;

    const rank = getRankFromRankingRow(row, index + 1);

    if (!Number.isFinite(rank) || rank <= 0) return;

    if (!map.has(key)) {
      map.set(key, rank);
    }
  });

  return map;
}

async function deleteRowsInChunks(ids: string[]) {
  const chunkSize = 100;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("player_prices")
      .delete()
      .in("id", chunk);

    if (error) {
      throw new Error(error.message);
    }

    deleted += chunk.length;
  }

  return deleted;
}

async function importFieldForTournament(
  tournamentId: string,
  options: { tour?: string | null; deleteStale?: boolean }
) {
  if (!tournamentId) {
    return NextResponse.json({ error: "Missing tournamentId" }, { status: 400 });
  }

  const apiKey = process.env.DATAGOLF_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing DATAGOLF_API_KEY" },
      { status: 500 }
    );
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, slug, tour")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    return NextResponse.json(
      { error: tournamentError.message },
      { status: 500 }
    );
  }

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found", tournamentId },
      { status: 404 }
    );
  }

  const toursToTry = buildToursToTry(
    tournament as TournamentRow,
    options.tour ?? null
  );
  const attempts = [];

  let selectedAttempt: Awaited<ReturnType<typeof fetchDataGolfField>> | null =
    null;

  for (const tour of toursToTry) {
    const attempt = await fetchDataGolfField(apiKey, tour);

    attempts.push({
      tour,
      ok: attempt.ok,
      status: attempt.status,
      eventName: attempt.eventName,
      playerCount: attempt.players.length,
      error: attempt.error,
    });

    if (!attempt.ok || attempt.players.length === 0) continue;

    const match = eventLooksLikeMatch(
      tournament as TournamentRow,
      attempt.eventName
    );

    if (match.ok) {
      selectedAttempt = attempt;
      break;
    }
  }

  if (!selectedAttempt) {
    return NextResponse.json(
      {
        error: "No matching DataGolf field update found. Field was NOT imported.",
        poolrTournamentId: tournamentId,
        poolrTournamentName: tournament.name,
        poolrTournamentSlug: tournament.slug,
        poolrTournamentTour: tournament.tour,
        attempts,
        note:
          "Poolr only imports a field when DataGolf's event name matches the selected tournament.",
      },
      { status: 409 }
    );
  }

  const rankingsResult = await fetchDataGolfRankings(apiKey);

  if (!rankingsResult.ok) {
    return NextResponse.json(
      {
        error: "DataGolf field was found, but DataGolf rankings could not be loaded.",
        details: rankingsResult.error,
        note:
          "Poolr needs the rankings endpoint so players like qualifiers are not accidentally labeled as DG #2 just because of field-update ordering.",
      },
      { status: 500 }
    );
  }

  const rankingMap = buildRankingMap(rankingsResult.rows);

  const dataGolfField = selectedAttempt.players
    .map((player: any, index: number) => {
      const playerName = getPlayerName(player);
      if (!playerName) return null;

      const normalizedName = normalizeName(playerName);
      const realDgRank = rankingMap.get(normalizedName) ?? null;

      // If a player is not in the top-500 DG rankings, put him below ranked players
      // while still keeping a stable order within the tournament field.
      const sortRank = realDgRank ?? 10000 + index;
      const pricingRank = Math.min(sortRank, 180);

      return {
        player_name: playerName,
        normalized_name: normalizedName,
        datagolf_rank: realDgRank,
        sort_rank: sortRank,
        salary: salaryFromRank(pricingRank),
        tier: tierFromRank(pricingRank),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.sort_rank - b.sort_rank) as FieldPlayer[];

  if (dataGolfField.length === 0) {
    return NextResponse.json(
      {
        error: "DataGolf returned the tournament, but no usable players were found.",
        datagolfEvent: selectedAttempt.eventName,
        sample: selectedAttempt.players.slice(0, 10),
      },
      { status: 500 }
    );
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("player_prices")
    .select("id, tournament_id, golfer_id, player_name")
    .eq("tournament_id", tournamentId);

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  const existingList = ((existingRows ?? []) as ExistingPlayerPrice[]).filter(
    (row) => row.id
  );

  const existingMap = new Map<string, ExistingPlayerPrice>();

  for (const row of existingList) {
    const key = normalizeName(row.player_name);

    if (!key) continue;

    existingMap.set(key, row);
  }

  const currentFieldNames = new Set(
    dataGolfField.map((player) => player.normalized_name)
  );

  const staleRows = existingList.filter((row) => {
    const key = normalizeName(row.player_name);
    return key && !currentFieldNames.has(key);
  });

  const updates = [];
  const inserts = [];

  for (const player of dataGolfField) {
    const existing = existingMap.get(player.normalized_name);
    const golferId = existing?.golfer_id || crypto.randomUUID();

    const baseRow = {
      tournament_id: tournamentId,
      golfer_id: golferId,
      player_name: player.player_name,
      // Store unranked players as 9999 so the UI can put them below ranked players.
      datagolf_rank: player.datagolf_rank ?? 9999,
      salary: player.salary,
      tier: player.tier,
    };

    if (existing) {
      updates.push({
        id: existing.id,
        ...baseRow,
      });
    } else {
      inserts.push({
        ...baseRow,
        win_odds: null,
        top_5_odds: null,
        top_10_odds: null,
        odds_updated_at: null,
      });
    }
  }

  const updateResults = await Promise.all(
    updates.map((row: any) =>
      supabase
        .from("player_prices")
        .update({
          golfer_id: row.golfer_id,
          player_name: row.player_name,
          datagolf_rank: row.datagolf_rank,
          salary: row.salary,
          tier: row.tier,
        })
        .eq("id", row.id)
    )
  );

  const failedUpdates = updateResults.filter((result) => result.error);

  if (failedUpdates.length > 0) {
    return NextResponse.json(
      {
        error: "Some player_prices updates failed.",
        failedCount: failedUpdates.length,
        firstError: failedUpdates[0].error?.message,
      },
      { status: 500 }
    );
  }

  let insertedCount = 0;

  if (inserts.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("player_prices")
      .insert(inserts)
      .select("id");

    if (insertError) {
      return NextResponse.json(
        {
          error: "Could not insert missing DataGolf field players into player_prices.",
          details: insertError.message,
          attemptedInsertCount: inserts.length,
          insertSample: inserts.slice(0, 10),
        },
        { status: 500 }
      );
    }

    insertedCount = insertedRows?.length ?? inserts.length;
  }

  let deletedStalePlayers = 0;

  if (options.deleteStale !== false && staleRows.length > 0) {
    try {
      deletedStalePlayers = await deleteRowsInChunks(
        staleRows.map((row) => row.id)
      );
    } catch (err: any) {
      return NextResponse.json(
        {
          error: "Field was updated, but stale player deletion failed.",
          details: err?.message || "Unknown delete error",
          staleCount: staleRows.length,
          staleSample: staleRows.slice(0, 20),
        },
        { status: 500 }
      );
    }
  }

  const now = new Date().toISOString();

  return NextResponse.json({
    success: true,
    tournamentId,
    poolrTournamentName: tournament.name,
    poolrTournamentTour: tournament.tour,
    datagolfEvent: selectedAttempt.eventName,
    datagolfTourUsed: selectedAttempt.tour,
    existingPlayerPricesBefore: existingList.length,
    dataGolfFieldPlayers: dataGolfField.length,
    dgRankingRowsLoaded: rankingsResult.rows.length,
    rankedFieldPlayers: dataGolfField.filter((player) => player.datagolf_rank !== null).length,
    unrankedFieldPlayers: dataGolfField.filter((player) => player.datagolf_rank === null).length,
    updatedExistingPlayers: updates.length,
    insertedMissingPlayers: insertedCount,
    deletedStalePlayers,
    finalExpectedPlayerCount: dataGolfField.length,
    top20: dataGolfField.slice(0, 20),
    updatedAt: now,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId") || "";
    const tour = searchParams.get("tour");
    const deleteStale = searchParams.get("deleteStale") !== "false";

    return await importFieldForTournament(tournamentId, {
      tour,
      deleteStale,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Unknown error",
        name: err?.name || null,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tournamentId = body?.tournamentId || "";
    const tour = body?.tour ?? null;
    const deleteStale = body?.deleteStale !== false;

    return await importFieldForTournament(tournamentId, {
      tour,
      deleteStale,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Unknown error",
        name: err?.name || null,
      },
      { status: 500 }
    );
  }
}

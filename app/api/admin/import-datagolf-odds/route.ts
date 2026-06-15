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

type PlayerPriceRow = {
  id: string;
  player_name: string | null;
};

type DataGolfMarket = {
  label: "win" | "top_5" | "top_10";
  endpointMarket: string;
  dbColumn: "win_odds" | "top_5_odds" | "top_10_odds";
};

const DATAGOLF_MARKETS: DataGolfMarket[] = [
  {
    label: "win",
    endpointMarket: "win",
    dbColumn: "win_odds",
  },
  {
    label: "top_5",
    endpointMarket: "top_5",
    dbColumn: "top_5_odds",
  },
  {
    label: "top_10",
    endpointMarket: "top_10",
    dbColumn: "top_10_odds",
  },
];

function cleanName(name: string) {
  if (!name) return "";

  const trimmed = name.trim();

  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((part) => part.trim());
    return `${first} ${last}`.trim();
  }

  return trimmed;
}

function normalizeName(name: string | null | undefined) {
  return cleanName(String(name ?? ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/jr\.?|sr\.?|iii|ii|iv/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isUSOpen(value: string | null | undefined) {
  const text = normalizeText(value);
  return text.includes("u s open") || text.includes("us open");
}

function getDataGolfTour(value: string | null | undefined) {
  const tour = String(value ?? "").toLowerCase();

  if (tour.includes("liv")) return "alt";
  if (tour.includes("euro") || tour.includes("dp")) return "euro";
  if (tour.includes("kft") || tour.includes("korn")) return "kft";
  if (tour.includes("opp")) return "opp";
  if (tour.includes("alt")) return "alt";

  return "pga";
}

function getOddsApiSportKey(tournament: TournamentRow) {
  const combined = normalizeText(`${tournament.name ?? ""} ${tournament.slug ?? ""}`);

  if (isUSOpen(combined)) {
    return "golf_us_open_winner";
  }

  if (combined.includes("masters")) {
    return "golf_masters_tournament_winner";
  }

  if (combined.includes("pga championship")) {
    return "golf_pga_championship_winner";
  }

  if (
    combined.includes("the open championship") ||
    combined.includes("open championship") ||
    combined.includes("british open")
  ) {
    return "golf_the_open_championship_winner";
  }

  return null;
}

function extractDataGolfEventName(raw: any) {
  return String(
    raw?.event_name ||
      raw?.event ||
      raw?.tournament_name ||
      raw?.tournament ||
      raw?.course_name ||
      raw?.meta?.event_name ||
      raw?.market?.event_name ||
      ""
  );
}

function eventLooksLikeMatch(tournament: TournamentRow, dataGolfEventRaw: string) {
  const expectedName = normalizeText(tournament.name);
  const expectedSlug = normalizeText(tournament.slug);
  const dataGolfEvent = normalizeText(dataGolfEventRaw);

  if (!dataGolfEvent) {
    return {
      ok: true,
      reason: "DataGolf did not return an event name.",
    };
  }

  const expectedRaw = `${tournament.name ?? ""} ${tournament.slug ?? ""}`;

  if (isUSOpen(expectedRaw)) {
    const ok = isUSOpen(dataGolfEventRaw);

    return {
      ok,
      reason: ok
        ? "U.S. Open matched."
        : `DataGolf event "${dataGolfEventRaw}" is not the U.S. Open.`,
    };
  }

  if (expectedName && dataGolfEvent.includes(expectedName)) {
    return {
      ok: true,
      reason: "Event name matched.",
    };
  }

  if (expectedSlug && dataGolfEvent.includes(expectedSlug)) {
    return {
      ok: true,
      reason: "Event slug matched.",
    };
  }

  return {
    ok: false,
    reason: `DataGolf event "${dataGolfEventRaw}" does not match Poolr tournament "${tournament.name}".`,
  };
}

function getPlayerName(row: any) {
  return cleanName(
    row?.player_name ||
      row?.name ||
      row?.player ||
      row?.golfer_name ||
      row?.dg_name ||
      row?.display_name ||
      row?.outcome_name ||
      ""
  );
}

function parseAmericanOdds(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    return (
      parseAmericanOdds(objectValue.american) ??
      parseAmericanOdds(objectValue.american_odds) ??
      parseAmericanOdds(objectValue.odds) ??
      parseAmericanOdds(objectValue.price) ??
      parseAmericanOdds(objectValue.line)
    );
  }

  const cleaned = String(value).trim().replace("+", "").replace(",", "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return null;

  if (Math.abs(parsed) > 0 && Math.abs(parsed) < 100) return null;

  return Math.round(parsed);
}

function chooseBestAmericanOdds(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));

  if (valid.length === 0) return null;

  return Math.max(...valid);
}

function collectOddsFromAnyShape(value: unknown, depth = 0): number[] {
  if (depth > 5 || value === null || value === undefined) return [];

  const direct = parseAmericanOdds(value);

  if (direct !== null) {
    return [direct];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectOddsFromAnyShape(item, depth + 1));
  }

  if (typeof value !== "object") {
    return [];
  }

  const objectValue = value as Record<string, unknown>;
  const odds: number[] = [];

  for (const [rawKey, rawValue] of Object.entries(objectValue)) {
    const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");

    const skip =
      key.includes("player") ||
      key.includes("name") ||
      key.includes("country") ||
      key.includes("rank") ||
      key.includes("prob") ||
      key.includes("percent") ||
      key.includes("prediction") ||
      key.includes("baseline") ||
      key === "id";

    if (skip) continue;

    const looksLikeOdds =
      key.includes("odds") ||
      key.includes("price") ||
      key.includes("line") ||
      key.includes("book") ||
      key.includes("dk") ||
      key.includes("fd") ||
      key.includes("mgm") ||
      key.includes("bovada") ||
      key.includes("caesars") ||
      key.includes("draftkings") ||
      key.includes("fanduel") ||
      key.includes("bet");

    if (!looksLikeOdds) continue;

    odds.push(...collectOddsFromAnyShape(rawValue, depth + 1));
  }

  return odds;
}

function extractBestDataGolfOdds(row: any) {
  const obviousCandidates = [
    row?.best_odds,
    row?.best,
    row?.odds,
    row?.american_odds,
    row?.market_odds,
    row?.price,
    row?.line,
  ];

  const directOdds = obviousCandidates
    .map(parseAmericanOdds)
    .filter((value): value is number => value !== null);

  const nestedOdds = collectOddsFromAnyShape(row);

  return chooseBestAmericanOdds([...directOdds, ...nestedOdds]);
}

function extractRows(raw: any) {
  const candidates = [
    raw?.odds,
    raw?.players,
    raw?.data,
    raw?.outrights,
    raw?.market,
    raw?.markets,
    raw?.books,
    raw?.baseline,
    raw,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

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

function buildPlayerMap(playerPrices: PlayerPriceRow[]) {
  const playerMap = new Map<string, PlayerPriceRow>();

  for (const player of playerPrices) {
    const key = normalizeName(player.player_name);
    if (key) playerMap.set(key, player);
  }

  return playerMap;
}

async function updatePlayerOdds(
  updates: Map<
    string,
    {
      id: string;
      win_odds?: number;
      top_5_odds?: number;
      top_10_odds?: number;
    }
  >
) {
  const now = new Date().toISOString();
  const rows = Array.from(updates.values());

  if (rows.length === 0) {
    return {
      updatedPlayers: 0,
      failedCount: 0,
      firstError: null as string | null,
      sampleUpdates: [],
      updatedAt: now,
    };
  }

  const results = await Promise.all(
    rows.map((row) => {
      const updatePayload: Record<string, number | string> = {
        odds_updated_at: now,
      };

      if (typeof row.win_odds === "number") {
        updatePayload.win_odds = row.win_odds;
      }

      if (typeof row.top_5_odds === "number") {
        updatePayload.top_5_odds = row.top_5_odds;
      }

      if (typeof row.top_10_odds === "number") {
        updatePayload.top_10_odds = row.top_10_odds;
      }

      return supabase
        .from("player_prices")
        .update(updatePayload)
        .eq("id", row.id);
    })
  );

  const failed = results.filter((result) => result.error);

  return {
    updatedPlayers: rows.length,
    failedCount: failed.length,
    firstError: failed[0]?.error?.message ?? null,
    sampleUpdates: rows.slice(0, 15),
    updatedAt: now,
  };
}

async function fetchDataGolfMarket(
  apiKey: string,
  tour: string,
  market: DataGolfMarket
) {
  const url =
    `https://feeds.datagolf.com/betting-tools/outrights` +
    `?tour=${encodeURIComponent(tour)}` +
    `&market=${encodeURIComponent(market.endpointMarket)}` +
    `&odds_format=american` +
    `&file_format=json` +
    `&key=${apiKey}`;

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const text = await response.text();

    return {
      ok: false,
      status: response.status,
      raw: null,
      rows: [] as any[],
      eventName: "",
      error: text,
    };
  }

  const raw = await response.json();

  return {
    ok: true,
    status: response.status,
    raw,
    rows: extractRows(raw),
    eventName: extractDataGolfEventName(raw),
    error: null,
  };
}

async function tryDataGolfOdds(
  tournament: TournamentRow,
  playerPrices: PlayerPriceRow[]
) {
  const apiKey = process.env.DATAGOLF_API_KEY;

  if (!apiKey) {
    return {
      source: "datagolf",
      success: false,
      skipped: true,
      reason: "Missing DATAGOLF_API_KEY.",
      updatedPlayers: 0,
      marketSummaries: [],
    };
  }

  const tour = getDataGolfTour(tournament.tour);
  const playerMap = buildPlayerMap(playerPrices);

  const updatesByPlayerId = new Map<
    string,
    {
      id: string;
      win_odds?: number;
      top_5_odds?: number;
      top_10_odds?: number;
    }
  >();

  const marketSummaries = [];

  for (const market of DATAGOLF_MARKETS) {
    const result = await fetchDataGolfMarket(apiKey, tour, market);

    if (!result.ok) {
      marketSummaries.push({
        market: market.label,
        ok: false,
        status: result.status,
        error: result.error,
      });
      continue;
    }

    const eventMatch = eventLooksLikeMatch(tournament, result.eventName);

    if (!eventMatch.ok) {
      marketSummaries.push({
        market: market.label,
        ok: false,
        blocked: true,
        reason: eventMatch.reason,
        datagolfEvent: result.eventName || null,
        rowsReturned: result.rows.length,
      });
      continue;
    }

    let matchedPlayers = 0;
    let playersWithUsableOdds = 0;
    const unmatchedNames: string[] = [];

    for (const row of result.rows) {
      const playerName = getPlayerName(row);
      const key = normalizeName(playerName);

      if (!key) continue;

      const matchedPlayer = playerMap.get(key);

      if (!matchedPlayer) {
        unmatchedNames.push(playerName);
        continue;
      }

      matchedPlayers += 1;

      const bestOdds = extractBestDataGolfOdds(row);

      if (bestOdds === null) continue;

      playersWithUsableOdds += 1;

      const existingUpdate = updatesByPlayerId.get(matchedPlayer.id) ?? {
        id: matchedPlayer.id,
      };

      existingUpdate[market.dbColumn] = bestOdds;
      updatesByPlayerId.set(matchedPlayer.id, existingUpdate);
    }

    const overlapRatio =
      result.rows.length > 0 ? matchedPlayers / result.rows.length : 0;

    if (!result.eventName && result.rows.length >= 20 && overlapRatio < 0.55) {
      marketSummaries.push({
        market: market.label,
        ok: false,
        blocked: true,
        reason:
          "DataGolf did not return an event name and player overlap was too low.",
        rowsReturned: result.rows.length,
        matchedPlayers,
        overlapRatio,
        unmatchedSample: unmatchedNames.slice(0, 12),
      });
      continue;
    }

    marketSummaries.push({
      market: market.label,
      ok: true,
      datagolfEvent: result.eventName || null,
      rowsReturned: result.rows.length,
      matchedPlayers,
      playersWithUsableOdds,
      unmatchedCount: unmatchedNames.length,
      unmatchedSample: unmatchedNames.slice(0, 12),
    });
  }

  const updateResult = await updatePlayerOdds(updatesByPlayerId);

  return {
    source: "datagolf",
    success: updateResult.updatedPlayers > 0 && updateResult.failedCount === 0,
    skipped: false,
    tourUsed: tour,
    updatedPlayers: updateResult.updatedPlayers,
    failedCount: updateResult.failedCount,
    firstError: updateResult.firstError,
    marketSummaries,
    sampleUpdates: updateResult.sampleUpdates,
    updatedAt: updateResult.updatedAt,
  };
}

async function tryOddsApiMajorWinnerOdds(
  tournament: TournamentRow,
  playerPrices: PlayerPriceRow[]
) {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const sportKey = getOddsApiSportKey(tournament);

  if (!sportKey) {
    return {
      source: "the_odds_api",
      success: false,
      skipped: true,
      reason: "This tournament is not one of the four major championship winner markets.",
      sportKey: null,
      updatedPlayers: 0,
    };
  }

  if (!apiKey) {
    return {
      source: "the_odds_api",
      success: false,
      skipped: true,
      reason: "Missing THE_ODDS_API_KEY in .env.local.",
      sportKey,
      updatedPlayers: 0,
    };
  }

  const url =
    `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sportKey)}/odds` +
    `?regions=us` +
    `&markets=outrights` +
    `&oddsFormat=american` +
    `&apiKey=${apiKey}`;

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const text = await response.text();

    return {
      source: "the_odds_api",
      success: false,
      skipped: false,
      sportKey,
      status: response.status,
      error: text,
      updatedPlayers: 0,
    };
  }

  const events = await response.json();
  const playerMap = buildPlayerMap(playerPrices);

  const bestOddsByPlayerId = new Map<
    string,
    {
      id: string;
      win_odds: number;
    }
  >();

  const unmatchedNames = new Set<string>();
  let totalOutcomes = 0;
  let matchedOutcomes = 0;
  let bookmakersSeen = 0;

  const eventArray = Array.isArray(events) ? events : [];

  for (const event of eventArray) {
    const bookmakers = Array.isArray(event?.bookmakers) ? event.bookmakers : [];

    for (const bookmaker of bookmakers) {
      bookmakersSeen += 1;

      const markets = Array.isArray(bookmaker?.markets) ? bookmaker.markets : [];

      for (const market of markets) {
        if (market?.key !== "outrights") continue;

        const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];

        for (const outcome of outcomes) {
          const playerName = getPlayerName(outcome);
          const key = normalizeName(playerName);
          const price = parseAmericanOdds(outcome?.price);

          if (!key || price === null) continue;

          totalOutcomes += 1;

          const matchedPlayer = playerMap.get(key);

          if (!matchedPlayer) {
            unmatchedNames.add(playerName);
            continue;
          }

          matchedOutcomes += 1;

          const existing = bestOddsByPlayerId.get(matchedPlayer.id);

          if (!existing || price > existing.win_odds) {
            bestOddsByPlayerId.set(matchedPlayer.id, {
              id: matchedPlayer.id,
              win_odds: price,
            });
          }
        }
      }
    }
  }

  const updatesByPlayerId = new Map<
    string,
    {
      id: string;
      win_odds?: number;
      top_5_odds?: number;
      top_10_odds?: number;
    }
  >();

  for (const row of bestOddsByPlayerId.values()) {
    updatesByPlayerId.set(row.id, {
      id: row.id,
      win_odds: row.win_odds,
    });
  }

  const overlapRatio = totalOutcomes > 0 ? matchedOutcomes / totalOutcomes : 0;

  if (totalOutcomes >= 20 && overlapRatio < 0.45) {
    return {
      source: "the_odds_api",
      success: false,
      skipped: false,
      sportKey,
      error:
        "The Odds API returned odds, but player overlap was too low. Odds were NOT imported.",
      totalEventsReturned: eventArray.length,
      bookmakersSeen,
      totalOutcomes,
      matchedOutcomes,
      overlapRatio,
      unmatchedSample: Array.from(unmatchedNames).slice(0, 20),
      updatedPlayers: 0,
    };
  }

  const updateResult = await updatePlayerOdds(updatesByPlayerId);

  return {
    source: "the_odds_api",
    success: updateResult.updatedPlayers > 0 && updateResult.failedCount === 0,
    skipped: false,
    sportKey,
    totalEventsReturned: eventArray.length,
    bookmakersSeen,
    totalOutcomes,
    matchedOutcomes,
    overlapRatio,
    updatedPlayers: updateResult.updatedPlayers,
    failedCount: updateResult.failedCount,
    firstError: updateResult.firstError,
    unmatchedSample: Array.from(unmatchedNames).slice(0, 20),
    sampleUpdates: updateResult.sampleUpdates,
    updatedAt: updateResult.updatedAt,
  };
}

async function importOddsForTournament(
  tournamentId: string,
  options: { forceSource?: string | null }
) {
  if (!tournamentId) {
    return NextResponse.json(
      { error: "Missing tournamentId" },
      { status: 400 }
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
      {
        error: "Tournament not found.",
        tournamentId,
      },
      { status: 404 }
    );
  }

  const { data: playerPrices, error: playerPricesError } = await supabase
    .from("player_prices")
    .select("id, player_name")
    .eq("tournament_id", tournamentId);

  if (playerPricesError) {
    return NextResponse.json(
      { error: playerPricesError.message },
      { status: 500 }
    );
  }

  if (!playerPrices || playerPrices.length === 0) {
    return NextResponse.json(
      {
        error: "No player_prices rows found. Import the tournament field first.",
        tournamentId,
      },
      { status: 500 }
    );
  }

  const typedTournament = tournament as TournamentRow;
  const typedPlayerPrices = playerPrices as PlayerPriceRow[];

  const forceSource = String(options.forceSource ?? "").toLowerCase();

  const dataGolfResult =
    forceSource === "the_odds_api"
      ? {
          source: "datagolf",
          success: false,
          skipped: true,
          reason: "Skipped because forceSource=the_odds_api.",
          updatedPlayers: 0,
          marketSummaries: [],
        }
      : await tryDataGolfOdds(typedTournament, typedPlayerPrices);

  if (dataGolfResult.success && dataGolfResult.updatedPlayers > 0) {
    return NextResponse.json({
      success: true,
      tournamentId,
      poolrTournamentName: typedTournament.name,
      sourceUsed: "datagolf",
      totalPoolrPlayers: typedPlayerPrices.length,
      dataGolfResult,
      note:
        "DataGolf odds matched safely and were imported. The Odds API fallback was not needed.",
    });
  }

  const oddsApiResult =
    forceSource === "datagolf"
      ? {
          source: "the_odds_api",
          success: false,
          skipped: true,
          reason: "Skipped because forceSource=datagolf.",
          updatedPlayers: 0,
        }
      : await tryOddsApiMajorWinnerOdds(typedTournament, typedPlayerPrices);

  if (oddsApiResult.success && oddsApiResult.updatedPlayers > 0) {
    return NextResponse.json({
      success: true,
      tournamentId,
      poolrTournamentName: typedTournament.name,
      sourceUsed: "the_odds_api",
      totalPoolrPlayers: typedPlayerPrices.length,
      dataGolfResult,
      oddsApiResult,
      note:
        "DataGolf did not safely import odds, so Poolr used The Odds API fallback for major winner odds.",
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: "No safe odds source imported odds. Poolr should keep Odds Pending.",
      tournamentId,
      poolrTournamentName: typedTournament.name,
      totalPoolrPlayers: typedPlayerPrices.length,
      dataGolfResult,
      oddsApiResult,
    },
    { status: 500 }
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId") || "";
    const forceSource = searchParams.get("forceSource");

    return await importOddsForTournament(tournamentId, { forceSource });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
        name: error?.name || null,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tournamentId = body?.tournamentId || "";
    const forceSource = body?.forceSource ?? null;

    return await importOddsForTournament(tournamentId, { forceSource });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
        name: error?.name || null,
      },
      { status: 500 }
    );
  }
}
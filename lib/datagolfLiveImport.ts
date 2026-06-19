import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TournamentRow = {
  id: string;
  name: string | null;
  slug?: string | null;
  status?: string | null;
  tour?: string | null;
};

type PlayerPriceRow = {
  id: string;
  golfer_id: string | null;
  player_name?: string | null;
  name?: string | null;
};

type ExistingScoreRow = {
  id: string;
  golfer_id: string | null;
  player_name: string | null;
  updated_at: string | null;
};

type LiveScoreRow = {
  id: string;
  tournament_id: string;
  golfer_id: string | null;
  player_name: string | null;
  score: number | null;
  total_score: number | null;
  position: string | null;
  thru: string | null;
  status: string;
  updated_at: string;
};

export type LiveImportResult = {
  status: number;
  body: Record<string, unknown>;
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

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(String(value).replace("+", "").trim());

  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  const text = String(value ?? "").trim();

  return text || null;
}

function cleanName(name: string | null | undefined) {
  const raw = String(name ?? "").trim();

  if (!raw) return "";

  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return `${first} ${last}`.trim();
  }

  return raw;
}

function normalizeName(name: string | null | undefined) {
  return cleanName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
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

function eventLooksLikeMatch(tournament: TournamentRow, dataGolfEventRaw: string) {
  const dataGolfEvent = normalizeEventName(dataGolfEventRaw);

  if (!dataGolfEvent) return true;

  const expectedName = normalizeEventName(tournament.name);
  const expectedSlug = normalizeEventName(tournament.slug);
  const expectedRaw = `${tournament.name ?? ""} ${tournament.slug ?? ""}`;

  if (hasUSOpen(expectedRaw)) {
    return hasUSOpen(dataGolfEventRaw);
  }

  if (expectedName && dataGolfEvent.includes(expectedName)) return true;
  if (expectedSlug && dataGolfEvent.includes(expectedSlug)) return true;

  const importantWords = eventWords(tournament.name);

  if (importantWords.length >= 2) {
    const matchedWords = importantWords.filter((word) =>
      dataGolfEvent.includes(word)
    );

    return matchedWords.length === importantWords.length;
  }

  return false;
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

function isWaitingPosition(value: unknown) {
  const position = String(value ?? "").trim().toLowerCase();

  return (
    position === "waiting" ||
    position === "not started" ||
    position === "not_started"
  );
}

function hasStarted(row: any) {
  if (isWaitingPosition(row?.position)) return false;

  const thru = String(row?.thru ?? "").trim();

  return (
    (thru !== "" && thru !== "0" && thru !== "-" && thru !== "--") ||
    numberOrNull(row?.round) !== null
  );
}

function liveStatus(row: any, started: boolean) {
  if (!started) return "Not started";

  const thru = String(row?.thru ?? "").trim().toLowerCase();

  if (
    thru === "f" ||
    thru === "fin" ||
    thru === "finished" ||
    Number(row?.thru) >= 18
  ) {
    return "Finished";
  }

  return "Live";
}

function shouldMarkTournamentLive(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  return !["live", "locked", "final", "completed"].includes(normalized);
}

function shouldCronSyncTournament(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  return normalized === "live" || normalized === "locked";
}

function extractLivePlayers(data: any) {
  if (Array.isArray(data)) return data;

  for (const key of ["live_stats", "data", "players", "scores", "leaderboard"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function addPriceName(
  map: Map<string, PlayerPriceRow>,
  name: string | null | undefined,
  price: PlayerPriceRow
) {
  const key = normalizeName(name);

  if (key && !map.has(key)) {
    map.set(key, price);
  }
}

function addExistingScore(
  map: Map<string, ExistingScoreRow>,
  key: string | null | undefined,
  score: ExistingScoreRow
) {
  const normalizedKey = String(key ?? "").trim();

  if (normalizedKey && !map.has(normalizedKey)) {
    map.set(normalizedKey, score);
  }
}

function importSecrets() {
  return [process.env.ADMIN_IMPORT_SECRET, process.env.CRON_SECRET]
    .map((secret) => String(secret ?? "").trim())
    .filter(Boolean);
}

function secretMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function requestImportSecret(req: Request) {
  const authorization = String(req.headers.get("authorization") ?? "").trim();

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return (
    String(
      req.headers.get("x-admin-secret") ??
        req.headers.get("x-cron-secret") ??
        new URL(req.url).searchParams.get("secret") ??
        ""
    ).trim()
  );
}

export function authorizeImport(req: Request) {
  const expectedSecrets = importSecrets();

  if (expectedSecrets.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      return { ok: true as const };
    }

    return {
      ok: false as const,
      status: 500,
      error: "Missing ADMIN_IMPORT_SECRET or CRON_SECRET.",
    };
  }

  const providedSecret = requestImportSecret(req);

  if (
    providedSecret &&
    expectedSecrets.some((expectedSecret) =>
      secretMatches(providedSecret, expectedSecret)
    )
  ) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 401,
    error: "Unauthorized DataGolf live import.",
  };
}

export function authorizeCron(req: Request) {
  const expectedSecret = String(process.env.CRON_SECRET ?? "").trim();

  if (!expectedSecret) {
    return {
      ok: false as const,
      status: 401,
      error: "Missing CRON_SECRET.",
    };
  }

  const authorization = String(req.headers.get("authorization") ?? "").trim();
  const providedSecret = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (providedSecret && secretMatches(providedSecret, expectedSecret)) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 401,
    error: "Unauthorized DataGolf cron sync.",
  };
}

export async function importDataGolfLiveTournament({
  tournamentId,
  explicitTour = "",
}: {
  tournamentId: string;
  explicitTour?: string;
}): Promise<LiveImportResult> {
  if (!tournamentId) {
    return {
      status: 400,
      body: { error: "Missing tournamentId." },
    };
  }

  const apiKey = process.env.DATAGOLF_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: { error: "Missing DATAGOLF_API_KEY" },
    };
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, slug, status, tour")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    return {
      status: 500,
      body: { error: tournamentError.message },
    };
  }

  if (!tournament) {
    return {
      status: 404,
      body: { error: "Tournament not found.", tournamentId },
    };
  }

  const tour =
    explicitTour || dataGolfTourFromPoolrTour((tournament as TournamentRow).tour);
  const res = await fetch(
    `https://feeds.datagolf.com/preds/live-tournament-stats?tour=${encodeURIComponent(
      tour
    )}&stats=sg_total&round=event_cumulative&display=value&file_format=json&key=${apiKey}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const details = await res.text();

    return {
      status: 502,
      body: { error: "DataGolf failed", status: res.status, details },
    };
  }

  const data = await res.json();
  const dataGolfEvent = String(data?.event_name ?? "");

  if (!eventLooksLikeMatch(tournament as TournamentRow, dataGolfEvent)) {
    return {
      status: 409,
      body: {
        error: "DataGolf live event did not match Poolr tournament.",
        tournamentId,
        poolrTournamentName: tournament.name,
        datagolfEvent: dataGolfEvent || null,
        tour,
      },
    };
  }

  const players = extractLivePlayers(data);

  const { data: pricesData, error: pricesError } = await supabase
    .from("player_prices")
    .select("id, golfer_id, player_name")
    .eq("tournament_id", tournamentId);

  if (pricesError) {
    return {
      status: 500,
      body: { error: pricesError.message },
    };
  }

  const priceByName = new Map<string, PlayerPriceRow>();

  for (const price of (pricesData ?? []) as PlayerPriceRow[]) {
    addPriceName(priceByName, price.player_name, price);
    addPriceName(priceByName, price.name, price);
  }

  const { data: existingScoresData, error: existingScoresError } = await supabase
    .from("scores")
    .select("id, golfer_id, player_name, updated_at")
    .eq("tournament_id", tournamentId)
    .order("updated_at", { ascending: false });

  if (existingScoresError) {
    return {
      status: 500,
      body: { error: existingScoresError.message },
    };
  }

  const existingByGolferId = new Map<string, ExistingScoreRow>();
  const existingByName = new Map<string, ExistingScoreRow>();

  for (const score of (existingScoresData ?? []) as ExistingScoreRow[]) {
    addExistingScore(existingByGolferId, score.golfer_id, score);

    const nameKey = normalizeName(score.player_name);

    if (nameKey && !existingByName.has(nameKey)) {
      existingByName.set(nameKey, score);
    }
  }

  const importTimestamp = new Date().toISOString();
  const rowMatches = players
    .map((p: any) => {
      const started = hasStarted(p);
      const roundScore = numberOrNull(p.round);
      const tournamentTotal = numberOrNull(p.total);
      const position = !isWaitingPosition(p.position)
        ? textOrNull(p.position)
        : null;
      const dataGolfName = textOrNull(p.player_name);
      const price = priceByName.get(normalizeName(dataGolfName));
      const existing =
        (price?.golfer_id ? existingByGolferId.get(price.golfer_id) : undefined) ??
        existingByName.get(normalizeName(dataGolfName)) ??
        null;

      const row: LiveScoreRow = {
        id: existing?.id ?? crypto.randomUUID(),
        tournament_id: tournamentId,
        golfer_id: price?.golfer_id ?? existing?.golfer_id ?? null,
        player_name: dataGolfName,
        score: roundScore,
        total_score: tournamentTotal,
        position,
        thru: started ? textOrNull(p.thru) : null,
        status: liveStatus(p, started),
        updated_at: importTimestamp,
      };

      return { row, existing: Boolean(existing) };
    })
    .filter((match: { row: LiveScoreRow }) => match.row.player_name);

  const rows = rowMatches.map((match) => match.row);

  if (rows.length === 0) {
    return {
      status: 502,
      body: {
        error: "DataGolf returned no live score rows.",
        tournamentId,
        datagolfEvent: dataGolfEvent || null,
        tour,
      },
    };
  }

  const { error } = await supabase
    .from("scores")
    .upsert(rows, {
      onConflict: "id",
    });

  if (error) {
    return {
      status: 500,
      body: { error: error.message, details: error },
    };
  }

  const liveRows = rows.filter((row) => row.status === "Live");
  let tournamentStatusUpdated = false;
  let tournamentStatusError: string | null = null;

  if (
    liveRows.length > 0 &&
    shouldMarkTournamentLive((tournament as TournamentRow).status)
  ) {
    const { error: statusError } = await supabase
      .from("tournaments")
      .update({
        status: "Live",
        updated_at: importTimestamp,
      })
      .eq("id", tournamentId);

    tournamentStatusUpdated = !statusError;
    tournamentStatusError = statusError?.message ?? null;
  }

  const updatedRows = rowMatches.filter((match) => match.existing).length;

  return {
    status: 200,
    body: {
      success: true,
      tournamentId,
      count: rows.length,
      updatedRows,
      insertedRows: rows.length - updatedRows,
      upsertConflictTarget: "id",
      scoreFieldMapping: {
        score: "DataGolf round (current round)",
        total_score: "DataGolf total (full tournament total)",
      },
      rowsWithTournamentTotals: rows.filter((row) => row.total_score !== null).length,
      matchedGolferIds: rows.filter((row) => row.golfer_id).length,
      unmatchedLiveRows: rows.filter((row) => !row.golfer_id).length,
      unmatchedSample: players
        .filter((player: any) => !priceByName.get(normalizeName(player?.player_name)))
        .slice(0, 10)
        .map((player: any) => ({
          dg_id: player?.dg_id ?? null,
          player_name: player?.player_name ?? null,
        })),
      eventName: dataGolfEvent || null,
      dataGolfLastUpdated: data?.last_updated ?? null,
      importedAt: importTimestamp,
      tour,
      tournamentStatusUpdated,
      tournamentStatusError,
      waiting: rows.filter((row) => row.status === "Not started").length,
      live: liveRows.length,
      finished: rows.filter((row) => row.status === "Finished").length,
    },
  };
}

export async function importEligibleDataGolfLiveTournaments(
  explicitTournamentId?: string | null
): Promise<LiveImportResult> {
  if (explicitTournamentId) {
    const result = await importDataGolfLiveTournament({
      tournamentId: explicitTournamentId,
    });

    return {
      status: result.status,
      body: {
        success: result.status >= 200 && result.status < 300,
        mode: "single",
        results: [result.body],
      },
    };
  }

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, name, status, tour");

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    };
  }

  const activeTournaments = ((tournaments ?? []) as TournamentRow[]).filter(
    (tournament) => shouldCronSyncTournament(tournament.status)
  );

  if (activeTournaments.length === 0) {
    return {
      status: 200,
      body: {
        success: true,
        mode: "cron",
        count: 0,
        message: "No live or locked tournaments found for DataGolf sync.",
      },
    };
  }

  const results = [];

  for (const tournament of activeTournaments) {
    const result = await importDataGolfLiveTournament({
      tournamentId: tournament.id,
    });

    results.push({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      status: result.status,
      ...result.body,
    });
  }

  const failures = results.filter(
    (result) => Number(result.status) < 200 || Number(result.status) >= 300
  );

  return {
    status: failures.length > 0 ? 207 : 200,
    body: {
      success: failures.length === 0,
      mode: "cron",
      count: results.length,
      failures: failures.length,
      results,
    },
  };
}

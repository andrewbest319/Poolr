export const runtime = "nodejs";

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

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
  status?: string | null;
  tour?: string | null;
};

type PlayerPriceRow = {
  id: string;
  golfer_id: string | null;
  player_name?: string | null;
  name?: string | null;
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const tournamentId =
      String(body?.tournamentId ?? searchParams.get("tournamentId") ?? "").trim();
    const explicitTour = String(body?.tour ?? searchParams.get("tour") ?? "").trim();

    if (!tournamentId) {
      return NextResponse.json(
        { error: "Missing tournamentId." },
        { status: 400 }
      );
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
      .select("id, name, slug, status, tour")
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
        { error: "Tournament not found.", tournamentId },
        { status: 404 }
      );
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

      return NextResponse.json(
        { error: "DataGolf failed", status: res.status, details },
        { status: 502 }
      );
    }

    const data = await res.json();
    const dataGolfEvent = String(data?.event_name ?? "");

    if (!eventLooksLikeMatch(tournament as TournamentRow, dataGolfEvent)) {
      return NextResponse.json(
        {
          error: "DataGolf live event did not match Poolr tournament.",
          tournamentId,
          poolrTournamentName: tournament.name,
          datagolfEvent: dataGolfEvent || null,
          tour,
        },
        { status: 409 }
      );
    }

    const players = extractLivePlayers(data);

    const { data: pricesData, error: pricesError } = await supabase
      .from("player_prices")
      .select("id, golfer_id, player_name")
      .eq("tournament_id", tournamentId);

    if (pricesError) {
      return NextResponse.json(
        { error: pricesError.message },
        { status: 500 }
      );
    }

    const priceByName = new Map<string, PlayerPriceRow>();

    for (const price of ((pricesData ?? []) as PlayerPriceRow[])) {
      addPriceName(priceByName, price.player_name, price);
      addPriceName(priceByName, price.name, price);
    }

    const rows = players
      .map((p: any) => {
        const started = hasStarted(p);
        const dataGolfName = textOrNull(p.player_name);
        const price = priceByName.get(normalizeName(dataGolfName));

        return {
          tournament_id: tournamentId,
          golfer_id: price?.golfer_id ?? null,
          player_name: dataGolfName,
          score: started ? numberOrNull(p.round) : null,
          total_score: started ? numberOrNull(p.total) : null,
          position:
            started && !isWaitingPosition(p.position)
              ? textOrNull(p.position)
              : null,
          thru: started ? textOrNull(p.thru) : null,
          status: liveStatus(p, started),
          updated_at: new Date().toISOString(),
        };
      })
      .filter((row: any) => row.player_name);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: "DataGolf returned no live score rows.",
          tournamentId,
          datagolfEvent: dataGolfEvent || null,
          tour,
        },
        { status: 502 }
      );
    }

    const { error } = await supabase
      .from("scores")
      .upsert(rows, {
        onConflict: "tournament_id,player_name",
      });

    if (error) {
      return NextResponse.json({ error });
    }

    const liveRows = rows.filter((row: any) => row.status === "Live");
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournamentId);

      tournamentStatusUpdated = !statusError;
      tournamentStatusError = statusError?.message ?? null;
    }

    return NextResponse.json({
      success: true,
      tournamentId,
      count: rows.length,
      matchedGolferIds: rows.filter((row: any) => row.golfer_id).length,
      unmatchedLiveRows: rows.filter((row: any) => !row.golfer_id).length,
      unmatchedSample: players
        .filter((player: any) => !priceByName.get(normalizeName(player?.player_name)))
        .slice(0, 10)
        .map((player: any) => ({
          dg_id: player?.dg_id ?? null,
          player_name: player?.player_name ?? null,
        })),
      eventName: dataGolfEvent || null,
      lastUpdated: data?.last_updated ?? null,
      tour,
      tournamentStatusUpdated,
      tournamentStatusError,
      waiting: rows.filter((row: any) => row.status === "Not started").length,
      live: liveRows.length,
      finished: rows.filter((row: any) => row.status === "Finished").length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}

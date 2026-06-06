export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cleanName(name: string) {
  if (!name) return "";

  if (name.includes(",")) {
    const [last, first] = name.split(",").map((x) => x.trim());
    return `${first} ${last}`;
  }

  return name.trim();
}

function normalizeName(name: string) {
  return cleanName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function americanOddsNumber(value: any) {
  if (value === null || value === undefined) return 999999;
  const n = Number(String(value).replace("+", ""));
  return Number.isFinite(n) ? n : 999999;
}

function salaryFromRank(rank: number) {
  return Math.max(6000, Math.round(12200 - rank * 85));
}

function tierFromRank(rank: number) {
  return Math.ceil(rank / 12);
}

export async function POST(req: Request) {
  try {
    const { tournamentId } = await req.json();

    if (!tournamentId) {
      return NextResponse.json({ error: "Missing tournamentId" }, { status: 400 });
    }

    const apiKey = process.env.DATAGOLF_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing DATAGOLF_API_KEY" }, { status: 500 });
    }

    const url = `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&add_position=5,10&dead_heat=yes&odds_format=american&file_format=json&key=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "DataGolf request failed", status: res.status, details: text },
        { status: 500 }
      );
    }

    const raw = await res.json();
    const dataGolfPlayers = raw?.baseline ?? [];

    if (!Array.isArray(dataGolfPlayers) || dataGolfPlayers.length === 0) {
      return NextResponse.json(
        { error: "No DataGolf baseline players found", keys: Object.keys(raw ?? {}) },
        { status: 500 }
      );
    }

    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("golfer_id, player_name")
      .eq("tournament_id", tournamentId)
      .not("golfer_id", "is", null)
      .not("player_name", "is", null);

    if (scoresError) {
      return NextResponse.json({ error: scoresError.message }, { status: 500 });
    }

    const scoreMap = new Map(
      (scores ?? []).map((s: any) => [normalizeName(s.player_name), s])
    );

    const matched = dataGolfPlayers
      .map((p: any) => {
        const match = scoreMap.get(normalizeName(p.player_name));
        if (!match?.golfer_id) return null;

        return {
          golfer_id: match.golfer_id,
          player_name: cleanName(p.player_name),
          country: p.country ?? null,
          win_odds: p.win ?? null,
          top_5_odds: p.top_5 ?? null,
          top_10_odds: p.top_10 ?? null,
          odds_rank_score: americanOddsNumber(p.win),
        };
      })
      .filter((row: any) => row !== null)
      .sort((a: any, b: any) => a.odds_rank_score - b.odds_rank_score);

    if (matched.length === 0) {
      return NextResponse.json(
        {
          error: "No DataGolf players matched scores table",
          dataGolfSample: dataGolfPlayers.slice(0, 5),
          scoreSample: (scores ?? []).slice(0, 5),
        },
        { status: 500 }
      );
    }

    const rows = matched.map((p: any, index: number) => {
      const rank = index + 1;

      return {
        tournament_id: tournamentId,
        golfer_id: p.golfer_id,
        player_name: p.player_name,
        datagolf_rank: rank,
        win_odds: p.win_odds,
        top_5_odds: p.top_5_odds,
        top_10_odds: p.top_10_odds,
        salary: salaryFromRank(rank),
        tier: tierFromRank(rank),
      };
    });

    const { error: upsertError } = await supabase
      .from("player_prices")
      .upsert(rows, {
        onConflict: "tournament_id,golfer_id",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: rows.length,
      top5: rows.slice(0, 5),
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
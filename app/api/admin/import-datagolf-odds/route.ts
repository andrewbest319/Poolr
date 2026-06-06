import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeName(name: string) {
  if (!name) return "";

  if (name.includes(",")) {
    const [last, first] = name.split(",").map((x) => x.trim());
    return `${first} ${last}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function oddsToSalary(rank: number) {
  return Math.max(6000, 12000 - rank * 90);
}

function rankToTier(rank: number) {
  return Math.ceil(rank / 12);
}

export async function POST(req: Request) {
  try {
    const { tournamentId } = await req.json();

    if (!tournamentId) {
      return NextResponse.json(
        { error: "Missing tournamentId" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DATAGOLF_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing DATAGOLF_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const oddsUrl = `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=american&file_format=json&key=${apiKey}`;

    const res = await fetch(oddsUrl, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "DataGolf odds request failed", details: text },
        { status: 500 }
      );
    }

    const data = await res.json();

    const players = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.players)
      ? data.players
      : [];

    const { data: scores } = await supabase
      .from("scores")
      .select("golfer_id, player_name, tournament_id")
      .eq("tournament_id", tournamentId)
      .not("golfer_id", "is", null);

    const scoreMap = new Map(
      (scores ?? []).map((s) => [normalizeName(s.player_name), s])
    );

    const rows = players
      .map((player: any, index: number) => {
        const playerName =
          player.player_name ||
          player.name ||
          player.dg_name ||
          player.player ||
          "";

        const matchedScore = scoreMap.get(normalizeName(playerName));

        if (!matchedScore?.golfer_id) return null;

        const rank = index + 1;

        return {
          tournament_id: tournamentId,
          golfer_id: matchedScore.golfer_id,
          player_name: matchedScore.player_name,
          datagolf_rank: rank,
          win_odds:
            player.win_odds ??
            player.odds ??
            player.win ??
            player.market_odds ??
            null,
          top_5_odds:
            player.top_5_odds ??
            player.top5_odds ??
            player.top_5 ??
            null,
          top_10_odds:
            player.top_10_odds ??
            player.top10_odds ??
            player.top_10 ??
            null,
          salary: oddsToSalary(rank),
          tier: rankToTier(rank),
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return NextResponse.json({
        error: "No players matched. We need to inspect the DataGolf response shape.",
        sample: players.slice(0, 5),
      });
    }

    const { error } = await supabase.from("player_prices").upsert(rows, {
      onConflict: "tournament_id,golfer_id",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: rows.length,
      sample: rows.slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
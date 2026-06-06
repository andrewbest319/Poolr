export const runtime = "nodejs";

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { tournamentId } = await req.json();

    const res = await fetch(
      `https://feeds.datagolf.com/preds/live-tournament-stats?stats=sg_total&round=event_cumulative&display=value&file_format=json&key=${process.env.DATAGOLF_API_KEY}`
    );

    const data = await res.json();

const players =
  Array.isArray(data) ? data :
  data?.data ? data.data :
  data?.live_stats ? data.live_stats :
  data?.players ? data.players :
  [];

    const rows = players.map((p: any) => ({
      tournament_id: tournamentId,
      player_name: p.player_name,
      total_score: p.total,
      position: p.position,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("scores")
      .upsert(rows, {
        onConflict: "tournament_id,player_name",
      });

    if (error) {
      return NextResponse.json({ error });
    }

    return NextResponse.json({
      success: true,
      count: rows.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "failed" });
  }
}
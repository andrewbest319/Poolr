export const runtime = "nodejs";

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(String(value).replace("+", "").trim());

  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  const text = String(value ?? "").trim();

  return text || null;
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

export async function POST(req: Request) {
  try {
    const { tournamentId } = await req.json();

    if (!tournamentId) {
      return NextResponse.json(
        { error: "Missing tournamentId." },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://feeds.datagolf.com/preds/live-tournament-stats?stats=sg_total&round=event_cumulative&display=value&file_format=json&key=${process.env.DATAGOLF_API_KEY}`
    );

    if (!res.ok) {
      const details = await res.text();

      return NextResponse.json(
        { error: "DataGolf failed", status: res.status, details },
        { status: 502 }
      );
    }

    const data = await res.json();

    const players = Array.isArray(data)
      ? data
      : data?.data
      ? data.data
      : data?.live_stats
      ? data.live_stats
      : data?.players
      ? data.players
      : [];

    const rows = players
      .map((p: any) => {
        const started = hasStarted(p);

        return {
          tournament_id: tournamentId,
          player_name: textOrNull(p.player_name),
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
      eventName: data?.event_name ?? null,
      lastUpdated: data?.last_updated ?? null,
      waiting: rows.filter((row: any) => row.status === "Not started").length,
      live: rows.filter((row: any) => row.status === "Live").length,
      finished: rows.filter((row: any) => row.status === "Finished").length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";

import dns from "node:dns";
import https from "node:https";
import { NextResponse } from "next/server";

dns.setDefaultResultOrder("ipv4first");

function safeUrlInfo(url: string | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      valid: true,
    };
  } catch {
    return {
      valid: false,
    };
  }
}

function httpsGetJson(url: string, headers: Record<string, string>) {
  return new Promise<any>((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            ok: Number(res.statusCode) >= 200 && Number(res.statusCode) < 300,
            body: body ? JSON.parse(body) : null,
          });
        } catch {
          resolve({
            status: res.statusCode,
            ok: false,
            body,
          });
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dataGolfKey = process.env.DATAGOLF_API_KEY;

    const env = {
      supabaseUrlExists: Boolean(supabaseUrl),
      serviceKeyExists: Boolean(serviceKey),
      dataGolfKeyExists: Boolean(dataGolfKey),
      supabaseUrlInfo: safeUrlInfo(supabaseUrl),
    };

    if (!supabaseUrl || !serviceKey || !dataGolfKey) {
      return NextResponse.json({
        success: false,
        error: "Missing env value",
        env,
      });
    }

    const supabaseRestUrl = `${supabaseUrl}/rest/v1/scores?select=golfer_id,player_name,tournament_id&limit=3`;

    const supabaseResult = await httpsGetJson(supabaseRestUrl, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    });

    const dataGolfRes = await fetch(
      `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&add_position=5,10&dead_heat=yes&odds_format=american&file_format=json&key=${dataGolfKey}`,
      { cache: "no-store" }
    );

    const dataGolfJson = await dataGolfRes.json();

    return NextResponse.json({
      success: true,
      env,
      supabase: supabaseResult,
      datagolf: {
        ok: dataGolfRes.ok,
        status: dataGolfRes.status,
        event: dataGolfJson?.event_name ?? null,
        baselineCount: dataGolfJson?.baseline?.length ?? 0,
        firstPlayer: dataGolfJson?.baseline?.[0] ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Unknown error",
        name: err?.name || null,
        cause: err?.cause || null,
      },
      { status: 500 }
    );
  }
}
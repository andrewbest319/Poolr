import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.DATAGOLF_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: "Missing DATAGOLF_API_KEY",
      });
    }

    const url = `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&add_position=5,10&dead_heat=yes&odds_format=american&file_format=json&key=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });

    const text = await res.text();

    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type"),
      topLevelKeys: json ? Object.keys(json) : null,
      isArray: Array.isArray(json),
      sample: Array.isArray(json)
        ? json.slice(0, 3)
        : json
        ? Object.fromEntries(
            Object.entries(json).slice(0, 5)
          )
        : text.slice(0, 1000),
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || "Unknown error",
      name: err?.name || null,
      cause: err?.cause || null,
    });
  }
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import {
  authorizeImport,
  importDataGolfLiveTournament,
} from "../../../../lib/datagolfLiveImport";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function POST(req: Request) {
  try {
    const authorization = authorizeImport(req);

    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status, headers: noStoreHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const tournamentId =
      String(body?.tournamentId ?? searchParams.get("tournamentId") ?? "").trim();
    const explicitTour = String(body?.tour ?? searchParams.get("tour") ?? "").trim();
    const result = await importDataGolfLiveTournament({
      tournamentId,
      explicitTour,
    });

    return NextResponse.json(result.body, {
      status: result.status,
      headers: noStoreHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

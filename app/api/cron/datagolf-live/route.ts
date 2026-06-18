import { NextResponse } from "next/server";
import {
  authorizeCron,
  importEligibleDataGolfLiveTournaments,
} from "../../../../lib/datagolfLiveImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(req: Request) {
  try {
    const authorization = authorizeCron(req);

    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const tournamentId = String(searchParams.get("tournamentId") ?? "").trim();
    const result = await importEligibleDataGolfLiveTournaments(tournamentId);

    return NextResponse.json(
      {
        ...result.body,
        timestamp: new Date().toISOString(),
      },
      {
        status: result.status,
        headers: noStoreHeaders,
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

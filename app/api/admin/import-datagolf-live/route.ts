import { NextResponse } from "next/server";
import {
  authorizeImport,
  importEligibleDataGolfLiveTournaments,
} from "../../../../lib/datagolfLiveImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export { POST } from "../import-datagolf/route";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(req: Request) {
  try {
    const authorization = authorizeImport(req);

    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const tournamentId = String(searchParams.get("tournamentId") ?? "").trim();
    const result = await importEligibleDataGolfLiveTournaments(tournamentId);

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

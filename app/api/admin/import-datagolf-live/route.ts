import { NextResponse } from "next/server";

export const runtime = "nodejs";

export { POST } from "../import-datagolf/route";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "DataGolf live import is enabled. POST JSON with { tournamentId } or POST with ?tournamentId=... to import live scores.",
  });
}

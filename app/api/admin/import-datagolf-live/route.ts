import { NextResponse } from "next/server";

export const runtime = "nodejs";

export { POST } from "../import-datagolf/route";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "DataGolf live import is enabled. POST JSON with { tournamentId } and Authorization: Bearer <ADMIN_IMPORT_SECRET> to import live scores. Local development without a secret is allowed when NODE_ENV is not production.",
  });
}

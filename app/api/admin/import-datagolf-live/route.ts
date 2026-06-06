import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: false,
    message: "DataGolf live import route is not enabled yet.",
  });
}
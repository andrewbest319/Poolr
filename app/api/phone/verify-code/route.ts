export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(url, serviceRoleKey);
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Missing Twilio Verify environment variables.");
  }

  return {
    client: twilio(accountSid, authToken),
    serviceSid,
  };
}

function toE164USPhone(value: string | null | undefined) {
  const raw = String(value ?? "").trim();

  if (raw.startsWith("+")) {
    return raw.replace(/[^\d+]/g, "");
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const poolrUserId = String(body?.poolrUserId || "");
    const code = String(body?.code || "").trim();

    if (!poolrUserId) {
      return NextResponse.json(
        { error: "Missing Poolr user id." },
        { status: 401 }
      );
    }

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: "Enter the verification code." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: user, error: userError } = await supabaseAdmin
      .from("poolr_users")
      .select("id, phone, phone_verified")
      .eq("id", poolrUserId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Poolr account not found." },
        { status: 404 }
      );
    }

    if (user.phone_verified === true) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        message: "Phone number is already verified.",
      });
    }

    const to = toE164USPhone(user.phone);

    if (!to) {
      return NextResponse.json(
        { error: "Enter a valid U.S. phone number before verifying." },
        { status: 400 }
      );
    }

    const { client, serviceSid } = getTwilioClient();

    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to,
        code,
      });

    if (check.status !== "approved") {
      return NextResponse.json(
        { error: "Incorrect or expired code. Try again." },
        { status: 400 }
      );
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("poolr_users")
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", poolrUserId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Poolr verify phone code error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not verify phone code.",
      },
      { status: 500 }
    );
  }
}

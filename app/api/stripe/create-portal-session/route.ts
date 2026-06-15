export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return new Stripe(secretKey);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(url, serviceRoleKey);
}

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    if (process.env.VERCEL_URL.startsWith("http")) {
      return process.env.VERCEL_URL;
    }

    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const poolrUserId = String(body?.poolrUserId || "");

    if (!poolrUserId) {
      return NextResponse.json(
        { error: "Missing Poolr user id." },
        { status: 401 }
      );
    }

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: user, error: userError } = await supabaseAdmin
      .from("poolr_users")
      .select("*")
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

    const stripeCustomerId =
      typeof user.stripe_customer_id === "string"
        ? user.stripe_customer_id
        : "";

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "This account does not have a Stripe billing profile yet. Use Pricing to start a plan or buy a pool.",
        },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getSiteUrl()}/account`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe billing portal error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not open Stripe billing portal.",
      },
      { status: 500 }
    );
  }
}

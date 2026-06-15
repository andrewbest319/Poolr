export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type CheckoutPlan = "single" | "monthly" | "annual";

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

function getPriceId(plan: CheckoutPlan) {
  if (plan === "single") {
    return (
      process.env.STRIPE_SINGLE_POOL_PRICE_ID ||
      process.env.STRIPE_PRICE_SINGLE_POOL ||
      null
    );
  }

  if (plan === "monthly") {
    return (
      process.env.STRIPE_MONTHLY_PRO_PRICE_ID ||
      process.env.STRIPE_PRICE_MONTHLY ||
      null
    );
  }

  if (plan === "annual") {
    return (
      process.env.STRIPE_ANNUAL_PRO_PRICE_ID ||
      process.env.STRIPE_PRICE_ANNUAL ||
      null
    );
  }

  return null;
}

function getMode(plan: CheckoutPlan): Stripe.Checkout.SessionCreateParams.Mode {
  return plan === "single" ? "payment" : "subscription";
}

function getPlanLabel(plan: CheckoutPlan) {
  if (plan === "single") return "Single Pool";
  if (plan === "monthly") return "Monthly Pro";
  return "Annual Pro";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = String(body?.plan || "") as CheckoutPlan;
    const poolrUserId = String(body?.poolrUserId || "");

    if (!["single", "monthly", "annual"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid checkout plan." },
        { status: 400 }
      );
    }

    if (!poolrUserId) {
      return NextResponse.json(
        { error: "Missing Poolr user id." },
        { status: 401 }
      );
    }

    const priceId = getPriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            plan === "single"
              ? "Missing Stripe price id for single. Add STRIPE_SINGLE_POOL_PRICE_ID or STRIPE_PRICE_SINGLE_POOL to .env.local, then fully restart npm run dev."
              : plan === "monthly"
                ? "Missing Stripe price id for monthly. Add STRIPE_MONTHLY_PRO_PRICE_ID or STRIPE_PRICE_MONTHLY to .env.local, then fully restart npm run dev."
                : "Missing Stripe price id for annual. Add STRIPE_ANNUAL_PRO_PRICE_ID or STRIPE_PRICE_ANNUAL to .env.local, then fully restart npm run dev.",
        },
        { status: 500 }
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

    let stripeCustomerId =
      typeof user.stripe_customer_id === "string"
        ? user.stripe_customer_id
        : "";

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.full_name || undefined,
        phone: user.phone || undefined,
        metadata: {
          poolr_user_id: poolrUserId,
        },
      });

      stripeCustomerId = customer.id;

      const { error: updateCustomerError } = await supabaseAdmin
        .from("poolr_users")
        .update({
          stripe_customer_id: stripeCustomerId,
        })
        .eq("id", poolrUserId);

      if (updateCustomerError) {
        return NextResponse.json(
          { error: updateCustomerError.message },
          { status: 500 }
        );
      }
    }

    const siteUrl = getSiteUrl();
    const mode = getMode(plan);

    const metadata = {
      poolr_user_id: poolrUserId,
      plan,
      plan_label: getPlanLabel(plan),
    };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      customer: stripeCustomerId,
      client_reference_id: poolrUserId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    };

    if (mode === "payment") {
      sessionParams.payment_intent_data = {
        metadata,
      };
    }

    if (mode === "subscription") {
      sessionParams.subscription_data = {
        metadata,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a Checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Stripe Checkout session.",
      },
      { status: 500 }
    );
  }
}

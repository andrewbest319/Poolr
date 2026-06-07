import { NextResponse } from "next/server";
import Stripe from "stripe";

type PurchaseType = "single_pool" | "monthly" | "annual";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

function getPriceId(purchaseType: PurchaseType) {
  if (purchaseType === "single_pool") {
    return process.env.STRIPE_PRICE_SINGLE_POOL;
  }

  if (purchaseType === "monthly") {
    return process.env.STRIPE_PRICE_MONTHLY;
  }

  if (purchaseType === "annual") {
    return process.env.STRIPE_PRICE_ANNUAL;
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const poolId = String(body.poolId || "");
    const purchaseType = String(body.purchaseType || "") as PurchaseType;
    const poolrUserId = String(body.poolrUserId || "");
    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

    if (!origin) {
      return NextResponse.json(
        { error: "Missing site origin." },
        { status: 400 }
      );
    }

    if (!poolId) {
      return NextResponse.json(
        { error: "Missing pool ID." },
        { status: 400 }
      );
    }

    if (
      purchaseType !== "single_pool" &&
      purchaseType !== "monthly" &&
      purchaseType !== "annual"
    ) {
      return NextResponse.json(
        { error: "Invalid purchase type." },
        { status: 400 }
      );
    }

    const priceId = getPriceId(purchaseType);

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price ID." },
        { status: 500 }
      );
    }

    const mode = purchaseType === "single_pool" ? "payment" : "subscription";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        pool_id: poolId,
        purchase_type: purchaseType,
        poolr_user_id: poolrUserId,
      },
      success_url: `${origin}/pool/${poolId}/leaderboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create-pool?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    return NextResponse.json(
      { error: "Could not create Stripe checkout session." },
      { status: 500 }
    );
  }
}
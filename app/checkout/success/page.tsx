import Link from "next/link";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

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

async function applyCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const poolrUserId =
    session.metadata?.poolr_user_id || session.client_reference_id || "";
  const plan = session.metadata?.plan || "";

  if (!poolrUserId) {
    throw new Error("This checkout session is missing a Poolr user id.");
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("poolr_users")
    .select("*")
    .eq("id", poolrUserId)
    .maybeSingle();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("Poolr account not found.");

  const alreadyProcessed = user.last_stripe_checkout_session_id === sessionId;

  if (alreadyProcessed) {
    return {
      plan,
      alreadyProcessed: true,
    };
  }

  if (session.mode === "payment") {
    if (session.payment_status !== "paid") {
      throw new Error("Payment is not complete yet.");
    }

    const currentCredits = Number(user.single_pool_credits ?? 0);

    const { error: updateError } = await supabaseAdmin
      .from("poolr_users")
      .update({
        single_pool_credits: currentCredits + 1,
        poolr_plan: "single_pool_credit",
        last_stripe_checkout_session_id: sessionId,
        last_paid_at: new Date().toISOString(),
      })
      .eq("id", poolrUserId);

    if (updateError) throw new Error(updateError.message);

    return {
      plan,
      alreadyProcessed: false,
    };
  }

  if (session.mode === "subscription") {
    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    const subscriptionAny = subscription as any;
    const subscriptionStatus = subscription?.status || "active";
    const periodEnd =
      subscriptionAny?.current_period_end ||
      subscriptionAny?.items?.data?.[0]?.current_period_end;

    const { error: updateError } = await supabaseAdmin
      .from("poolr_users")
      .update({
        poolr_plan: plan === "annual" ? "annual_pro" : "monthly_pro",
        stripe_subscription_id: subscription?.id || null,
        stripe_subscription_status: subscriptionStatus,
        pro_active_until: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        last_stripe_checkout_session_id: sessionId,
        last_paid_at: new Date().toISOString(),
      })
      .eq("id", poolrUserId);

    if (updateError) throw new Error(updateError.message);

    return {
      plan,
      alreadyProcessed: false,
    };
  }

  throw new Error("Unsupported Stripe checkout mode.");
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const sessionId = getFirstParam(params.session_id);

  let title = "Payment confirmed";
  let message =
    "Your Poolr purchase has been applied. You can now continue creating pools.";
  let errorMessage = "";

  if (!sessionId) {
    title = "Missing checkout session";
    errorMessage = "Stripe did not return a checkout session id.";
  } else {
    try {
      const result = await applyCheckoutSession(sessionId);

      if (result.alreadyProcessed) {
        message =
          "This checkout was already applied to your Poolr account. You are good to continue.";
      } else if (result.plan === "single") {
        message =
          "Your Single Pool credit has been added. You can now create one premium pool.";
      } else {
        message =
          "Your Pro subscription is active. You can now create unlimited premium pools.";
      }
    } catch (error) {
      title = "Payment needs attention";
      errorMessage =
        error instanceof Error
          ? error.message
          : "Could not apply this Stripe payment to your Poolr account.";
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] px-6 py-16 text-white">
      <section className="mx-auto max-w-3xl rounded-[36px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
          Stripe Checkout
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          {title}
        </h1>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm font-bold leading-6 text-red-100">
            {errorMessage}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm font-bold leading-6 text-emerald-100">
            {message}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create-pool"
            className="rounded-2xl bg-emerald-400 px-6 py-4 text-center text-sm font-black text-black transition hover:bg-emerald-300"
          >
            Create Pool
          </Link>
          <Link
            href="/account"
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Account Center
          </Link>
          <Link
            href="/pricing"
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Back to Pricing
          </Link>
        </div>
      </section>
    </main>
  );
}

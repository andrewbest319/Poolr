// lib/billing.ts
import { supabaseAdmin } from "./supabaseAdmin";

export type PoolrPlan = "free" | "single_pool" | "monthly" | "annual";

export type PoolrExperienceRole = "creator" | "member";

export type BillingProfile = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  plan: PoolrPlan | string | null;

  // Old field kept for compatibility
  first_free_pool_used: boolean;

  // Correct Poolr rule
  first_poolr_experience_used: boolean;
  first_poolr_experience_used_at: string | null;
  first_poolr_experience_pool_id: string | null;
  first_poolr_experience_role: PoolrExperienceRole | string | null;

  current_period_end: string | null;
  created_at?: string;
  updated_at?: string;
};

export function hasUsedPoolrExperience(profile: BillingProfile | null) {
  if (!profile) return false;

  return Boolean(
    profile.first_poolr_experience_used || profile.first_free_pool_used
  );
}

export function isActiveSubscription(profile: BillingProfile | null) {
  if (!profile) return false;

  const hasPaidPlan =
    profile.plan === "monthly" || profile.plan === "annual";

  const isActive =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";

  return hasPaidPlan && isActive;
}

export async function getOrCreateBillingProfile(userId: string) {
  const existing = await supabaseAdmin
    .from("billing_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    return existing.data as BillingProfile;
  }

  const created = await supabaseAdmin
    .from("billing_profiles")
    .insert({
      user_id: userId,
      plan: "free",
      subscription_status: "inactive",
      first_free_pool_used: false,
      first_poolr_experience_used: false,
      first_poolr_experience_used_at: null,
      first_poolr_experience_pool_id: null,
      first_poolr_experience_role: null,
    })
    .select("*")
    .single();

  if (created.error) {
    throw created.error;
  }

  return created.data as BillingProfile;
}

export async function getBillingProfile(userId: string) {
  const result = await supabaseAdmin
    .from("billing_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data as BillingProfile | null;
}

/**
 * Main Poolr creation gate.
 *
 * This answers:
 * Can this user create a premium pool without paying right now?
 *
 * Correct rule:
 * - If user has monthly/annual active subscription: yes.
 * - Else if user has never created OR joined any premium Poolr pool: yes, free first experience.
 * - Else: they need Stripe checkout.
 */
export async function canCreatePremiumPool(userId: string) {
  const profile = await getOrCreateBillingProfile(userId);

  const usedExperience = hasUsedPoolrExperience(profile);
  const activeSubscription = isActiveSubscription(profile);

  return {
    canCreateForFree: !usedExperience,
    hasActiveSubscription: activeSubscription,
    needsPayment: usedExperience && !activeSubscription,
    profile,
  };
}

/**
 * Marks a user as having used their one lifetime Poolr experience.
 *
 * This should run when someone:
 * - creates their first premium pool
 * - joins their first premium pool
 *
 * This should NOT block users from joining paid pools.
 * It only prevents them from later creating another free premium pool.
 */
export async function markPoolrExperienceUsed({
  userId,
  poolId,
  role,
}: {
  userId: string;
  poolId?: string | null;
  role: PoolrExperienceRole;
}) {
  const profile = await getOrCreateBillingProfile(userId);

  if (hasUsedPoolrExperience(profile)) {
    return profile;
  }

  const now = new Date().toISOString();

  const result = await supabaseAdmin
    .from("billing_profiles")
    .update({
      first_free_pool_used: true,
      first_poolr_experience_used: true,
      first_poolr_experience_used_at: now,
      first_poolr_experience_pool_id: poolId || null,
      first_poolr_experience_role: role,
      updated_at: now,
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data as BillingProfile;
}

/**
 * Backwards-compatible alias.
 * Older code may still call markFirstFreePoolUsed().
 * We now route it into the correct Poolr experience logic.
 */
export async function markFirstFreePoolUsed(userId: string, poolId?: string | null) {
  return markPoolrExperienceUsed({
    userId,
    poolId,
    role: "creator",
  });
}

/**
 * Updates the user's subscription after Stripe confirms payment.
 */
export async function updateSubscriptionBillingProfile({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  subscriptionStatus,
  plan,
  currentPeriodEnd,
}: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus: string;
  plan: "monthly" | "annual" | "free";
  currentPeriodEnd?: string | null;
}) {
  const result = await supabaseAdmin
    .from("billing_profiles")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId || null,
        stripe_subscription_id: stripeSubscriptionId || null,
        subscription_status: subscriptionStatus,
        plan,
        current_period_end: currentPeriodEnd || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data as BillingProfile;
}

/**
 * Updates Stripe customer ID without changing their Poolr access status.
 * Useful after one-time single-pool checkout.
 */
export async function updateStripeCustomerForUser({
  userId,
  stripeCustomerId,
}: {
  userId: string;
  stripeCustomerId: string | null;
}) {
  const result = await supabaseAdmin
    .from("billing_profiles")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data as BillingProfile;
}
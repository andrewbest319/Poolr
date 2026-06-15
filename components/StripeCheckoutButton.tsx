"use client";

import { useState, type ReactNode } from "react";

type CheckoutPlan = "single" | "monthly" | "annual";

export default function StripeCheckoutButton({
  plan,
  children,
  className,
}: {
  plan: CheckoutPlan;
  children: ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (loading) return;

    const poolrUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("poolr_user_id")
        : null;

    if (!poolrUserId) {
      window.location.href = `/account?returnTo=${encodeURIComponent(
        "/pricing"
      )}`;
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          poolrUserId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(result?.error || "Could not start checkout.");
      }

      window.location.href = result.url;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Could not start checkout. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? "Opening Checkout..." : children}
    </button>
  );
}

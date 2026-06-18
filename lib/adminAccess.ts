import { supabaseAdmin } from "./supabaseAdmin";

export const COMMISSIONER_ADMIN_EMAIL = "andrewbest319@gmail.com";

export type AdminCheckResult =
  | {
      ok: true;
      admin: {
        id: string;
        email: string | null;
        full_name?: string | null;
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export async function requireCommissionerAdmin(
  req: Request
): Promise<AdminCheckResult> {
  const userId = String(req.headers.get("x-poolr-user-id") ?? "").trim();

  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized. Sign in as the Poolr admin account.",
    };
  }

  const { data: adminUser, error } = await supabaseAdmin
    .from("poolr_users")
    .select("id, email, email_normalized, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  const email = normalizeEmail(
    adminUser?.email_normalized || adminUser?.email
  );

  if (!adminUser || email !== COMMISSIONER_ADMIN_EMAIL) {
    return {
      ok: false,
      status: 403,
      error: "Unauthorized. Commissioner overrides are admin-only.",
    };
  }

  return {
    ok: true,
    admin: {
      id: adminUser.id,
      email: adminUser.email,
      full_name: adminUser.full_name,
    },
  };
}

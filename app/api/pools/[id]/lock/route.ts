export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getTournamentLockTimestamp,
  isTournamentLocked,
} from "../../../../../lib/poolLock";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LockAction = "lock" | "unlock";

function isValidAction(value: unknown): value is LockAction {
  return value === "lock" || value === "unlock";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const poolId = params.id;

    if (!poolId) {
      return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const action = body?.action;
    const creatorPoolrUserId = String(body?.creatorPoolrUserId || "");
    const creatorDemoUserId = String(body?.creatorDemoUserId || "");

    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Action must be lock or unlock." },
        { status: 400 }
      );
    }

    const { data: pool, error: poolError } = await supabaseAdmin
      .from("pools")
      .select(
        "id, name, tournament_id, is_locked, creator_poolr_user_id, creator_demo_user_id"
      )
      .eq("id", poolId)
      .maybeSingle();

    if (poolError) {
      return NextResponse.json({ error: poolError.message }, { status: 500 });
    }

    if (!pool) {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }

    const creatorMatchesPoolrUser =
      pool.creator_poolr_user_id &&
      creatorPoolrUserId &&
      pool.creator_poolr_user_id === creatorPoolrUserId;

    const creatorMatchesDemoUser =
      pool.creator_demo_user_id &&
      creatorDemoUserId &&
      pool.creator_demo_user_id === creatorDemoUserId;

    if (!creatorMatchesPoolrUser && !creatorMatchesDemoUser) {
      return NextResponse.json(
        {
          error: "Only the pool creator can lock or unlock this pool.",
        },
        { status: 403 }
      );
    }

    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", pool.tournament_id)
      .maybeSingle();

    if (tournamentError) {
      return NextResponse.json(
        { error: tournamentError.message },
        { status: 500 }
      );
    }

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found for this pool." },
        { status: 404 }
      );
    }

    const lockTimestamp = getTournamentLockTimestamp(tournament);
    const lockTime = lockTimestamp ? new Date(lockTimestamp).getTime() : NaN;
    const lockDate = Number.isFinite(lockTime) ? new Date(lockTime) : null;
    const now = new Date();
    const tournamentStarted = isTournamentLocked(tournament, now.getTime());

    if (action === "unlock" && tournamentStarted) {
      return NextResponse.json(
        {
          error:
            "This tournament has already started, so the pool cannot be unlocked.",
          tournamentStarted: true,
          lockDate: lockDate?.toISOString() ?? null,
        },
        { status: 409 }
      );
    }

    const updatePayload =
      action === "lock"
        ? {
            is_locked: true,
            locked_at: now.toISOString(),
            lock_note: tournamentStarted
              ? "Tournament lock active."
              : "Manually locked by pool creator.",
          }
        : {
            is_locked: false,
            locked_at: null,
            unlocked_at: now.toISOString(),
            lock_note: "Unlocked by pool creator before tournament start.",
          };

    const { data: updatedPool, error: updateError } = await supabaseAdmin
      .from("pools")
      .update(updatePayload)
      .eq("id", poolId)
      .select("id, name, is_locked, locked_at, unlocked_at, lock_note")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action,
      pool: updatedPool,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        lockDate: lockDate?.toISOString() ?? null,
        tournamentStarted,
      },
      rule:
        "Creator can lock/unlock before tournament start. After tournament start, unlock is blocked.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
        name: error?.name || null,
      },
      { status: 500 }
    );
  }
}

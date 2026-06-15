export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deletePool(req: Request, poolId: string) {
  if (!poolId) {
    return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const creatorPoolrUserId = String(body?.creatorPoolrUserId || "");
  const creatorDemoUserId = String(body?.creatorDemoUserId || "");

  if (!creatorPoolrUserId && !creatorDemoUserId) {
    return NextResponse.json(
      { error: "Missing creator identity." },
      { status: 401 }
    );
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("id, name, creator_poolr_user_id, creator_demo_user_id, tournament_id")
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
      { error: "Only the pool creator can delete this pool." },
      { status: 403 }
    );
  }

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("entries")
    .select("id")
    .eq("pool_id", poolId);

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  const entryIds = (entries ?? []).map((entry) => entry.id);

  if (entryIds.length > 0) {
    const { error: picksError } = await supabaseAdmin
      .from("picks")
      .delete()
      .in("entry_id", entryIds);

    if (picksError) {
      return NextResponse.json({ error: picksError.message }, { status: 500 });
    }
  }

  const { error: payoutsError } = await supabaseAdmin
    .from("payouts")
    .delete()
    .eq("pool_id", poolId);

  if (payoutsError) {
    return NextResponse.json({ error: payoutsError.message }, { status: 500 });
  }

  const { error: entriesDeleteError } = await supabaseAdmin
    .from("entries")
    .delete()
    .eq("pool_id", poolId);

  if (entriesDeleteError) {
    return NextResponse.json(
      { error: entriesDeleteError.message },
      { status: 500 }
    );
  }

  const { error: poolDeleteError } = await supabaseAdmin
    .from("pools")
    .delete()
    .eq("id", poolId);

  if (poolDeleteError) {
    return NextResponse.json({ error: poolDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deletedPoolId: poolId,
    deletedPoolName: pool.name,
    deletedEntries: entryIds.length,
    note:
      "Pool, entries, picks, and payouts were deleted. Tournament and player_prices were not touched.",
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return deletePool(req, params.id);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params);
  return deletePool(req, params.id);
}

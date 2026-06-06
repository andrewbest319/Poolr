import Link from "next/link";
import { supabase } from "../../lib/supabase";

type PoolFormat = "salary_cap" | "tiered_draft" | "salary-cap" | "tiered-draft";

type Pool = {
  id: string;
  name: string;
  format: PoolFormat;
  entry_fee: number | null;
  roster_size: number;
  counted_players: number;
  salary_cap: number | null;
  max_players: number | null;
  invite_code: string;
  premium: boolean;
  status: string;
  tournament_id: string | null;
};

type Tournament = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  lock_time: string | null;
  status: string | null;
};

type Entry = {
  id: string;
  user_id: string;
  pool_id: string;
  submitted: boolean;
  created_at: string | null;
};

type Pick = {
  id: string;
  entry_id: string;
  golfer_id: string;
};

type Golfer = {
  id: string;
  name: string;
  salary: number | null;
  tier: number | null;
  country: string | null;
  world_rank: number | null;
};

type Score = {
  id: string;
  tournament_id: string | null;
  golfer_id: string | null;
  player_name: string | null;
  round: number | null;
  score: number | null;
  total_score: number | null;
  position: string | null;
  thru: string | null;
  status: string | null;
  updated_at: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeName(name: string | null | undefined) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${Number(value).toLocaleString()}`;
}

function formatScore(value: number | null | undefined) {
  if (value == null) return "—";
  const score = Number(value);
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not updated yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not updated yet";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeFormat(format: PoolFormat) {
  return format === "salary_cap" || format === "salary-cap"
    ? "Salary Cap"
    : "Tiered Draft";
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        className
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-white/10 bg-white/[0.05] shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{hint}</p>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;

  const { data: poolData, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !poolData) {
    return (
      <main className="min-h-screen bg-[#040816] p-6 text-white">
        <GlassCard className="mx-auto max-w-7xl p-8">
          <p className="text-lg font-medium">Pool not found.</p>
        </GlassCard>
      </main>
    );
  }

  const pool = poolData as Pool;

  let tournament: Tournament | null = null;

  if (pool.tournament_id) {
    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", pool.tournament_id)
      .single();

    tournament = (tournamentData as Tournament | null) ?? null;
  }

  const { data: entriesData } = await supabase
    .from("entries")
    .select("*")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: true });

  const entries = (entriesData ?? []) as Entry[];
  const entryIds = entries.map((entry) => entry.id);

  const { data: picksData } = await supabase
    .from("picks")
    .select("id, entry_id, golfer_id")
    .in(
      "entry_id",
      entryIds.length ? entryIds : ["00000000-0000-0000-0000-000000000000"]
    );

  const picks = (picksData ?? []) as Pick[];
  const golferIds = [...new Set(picks.map((pick) => pick.golfer_id))];

  const { data: golfersData } = await supabase
    .from("golfers")
    .select("id, name, salary, tier, country, world_rank")
    .in(
      "id",
      golferIds.length ? golferIds : ["00000000-0000-0000-0000-000000000000"]
    );

  const golfers = (golfersData ?? []) as Golfer[];
  const golferMap = new Map(golfers.map((golfer) => [golfer.id, golfer]));

  const { data: scoresData } = await supabase
    .from("scores")
    .select("*")
    .eq("tournament_id", pool.tournament_id)
    .order("total_score", { ascending: true });

  const scores = (scoresData ?? []) as Score[];

  const scoreByGolferId = new Map<string, Score>();
  const scoreByName = new Map<string, Score>();

  for (const score of scores) {
    if (score.golfer_id) scoreByGolferId.set(score.golfer_id, score);
    if (score.player_name) scoreByName.set(normalizeName(score.player_name), score);
  }

  const leaderboard = entries
    .map((entry) => {
      const entryPicks = picks.filter((pick) => pick.entry_id === entry.id);

      const players = entryPicks
        .map((pick) => {
          const golfer = golferMap.get(pick.golfer_id) ?? null;

          const liveScore =
            scoreByGolferId.get(pick.golfer_id) ??
            scoreByName.get(normalizeName(golfer?.name)) ??
            null;

          const totalScore = Number(liveScore?.total_score ?? liveScore?.score ?? 0);

          return {
            pick,
            golfer,
            liveScore,
            totalScore,
          };
        })
        .sort((a, b) => a.totalScore - b.totalScore);

      const countedPlayers = players.slice(0, pool.counted_players);
      const totalScore = countedPlayers.reduce(
        (sum, player) => sum + player.totalScore,
        0
      );

      const lastUpdated =
        players
          .map((player) => player.liveScore?.updated_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

      return {
        entry,
        players,
        countedPlayers,
        totalScore,
        rosterCount: players.length,
        lastUpdated,
      };
    })
    .sort((a, b) => {
      if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
      return a.entry.created_at && b.entry.created_at
        ? new Date(a.entry.created_at).getTime() -
            new Date(b.entry.created_at).getTime()
        : 0;
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  const submittedCount = leaderboard.filter((row) => row.entry.submitted).length;
  const leaderScore = leaderboard.length ? leaderboard[0].totalScore : 0;
  const avgScore = leaderboard.length
    ? leaderboard.reduce((sum, row) => sum + row.totalScore, 0) / leaderboard.length
    : 0;

  const latestUpdate =
    scores
      .map((score) => score.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const topLiveScores = scores.slice(0, 25);

  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-8%] h-[420px] w-[420px] rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute right-[-10%] top-[5%] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[30%] h-[340px] w-[340px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/80">
              Poolr • Live Leaderboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {pool.name}
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              {tournament?.name ?? "Tournament TBD"}
              {tournament?.location ? ` • ${tournament.location}` : ""}
              {" • "}
              Last update: {formatDateTime(latestUpdate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-white/10 bg-white/5 text-slate-300">
              {normalizeFormat(pool.format)}
            </Badge>
            <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              DataGolf Connected
            </Badge>
            <Link
              href={`/pool/${poolId}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to Lobby
            </Link>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(6,182,212,0.08),rgba(255,255,255,0.02))]" />
          <div className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Entries"
              value={String(leaderboard.length)}
              hint="Total teams in this pool"
            />
            <StatTile
              label="Submitted"
              value={String(submittedCount)}
              hint="Teams officially locked in"
            />
            <StatTile
              label="Leader Score"
              value={formatScore(leaderScore)}
              hint="Lower is better"
            />
            <StatTile
              label="Live Players"
              value={String(scores.length)}
              hint="Pulled from DataGolf"
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6">
            {leaderboard.length === 0 ? (
              <GlassCard className="p-8">
                <p className="text-lg font-medium text-white">
                  No pool entries yet.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  DataGolf scores are connected. Once users submit teams, Poolr
                  will rank entries here.
                </p>
              </GlassCard>
            ) : (
              leaderboard.map((row) => (
                <GlassCard key={row.entry.id} className="p-6 sm:p-7">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-bold",
                            row.rank === 1 &&
                              "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
                            row.rank === 2 &&
                              "border-slate-300/20 bg-slate-300/10 text-slate-200",
                            row.rank === 3 &&
                              "border-orange-400/30 bg-orange-400/10 text-orange-200",
                            row.rank > 3 && "border-white/10 bg-white/5 text-white"
                          )}
                        >
                          {row.rank}
                        </div>

                        <div>
                          <h2 className="text-2xl font-semibold tracking-tight text-white">
                            Entry {row.rank}
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            User {row.entry.user_id.slice(0, 8)} •{" "}
                            {row.entry.submitted ? "Submitted" : "Draft"} • Updated{" "}
                            {formatDateTime(row.lastUpdated)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatTile
                        label="Total Score"
                        value={formatScore(row.totalScore)}
                        hint={`${pool.counted_players} scores counted`}
                      />
                      <StatTile
                        label="Roster"
                        value={`${row.rosterCount}/${pool.roster_size}`}
                        hint="Golfers selected"
                      />
                      <StatTile
                        label="Entry Fee"
                        value={formatMoney(pool.entry_fee)}
                        hint="Pool setting"
                      />
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                    <div className="grid grid-cols-[1.25fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/10 bg-black/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <div>Golfer</div>
                      <div>Rank</div>
                      <div>Salary</div>
                      <div>Position</div>
                      <div>Total</div>
                    </div>

                    <div className="divide-y divide-white/10">
                      {row.players.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-slate-400">
                          No picks yet.
                        </div>
                      ) : (
                        row.players.map((player, index) => {
                          const counted = index < pool.counted_players;

                          return (
                            <div
                              key={player.pick.id}
                              className={cn(
                                "grid grid-cols-[1.25fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 px-4 py-4",
                                counted ? "bg-emerald-400/[0.04]" : "bg-white/[0.02]"
                              )}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-white">
                                    {player.golfer?.name ?? "Unknown Golfer"}
                                  </p>
                                  {counted ? (
                                    <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                                      Counted
                                    </Badge>
                                  ) : (
                                    <Badge className="border-white/10 bg-white/5 text-slate-300">
                                      Bench
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {player.golfer?.country ?? "—"}
                                </p>
                              </div>

                              <div className="text-sm text-slate-300">
                                {player.golfer?.world_rank
                                  ? `#${player.golfer.world_rank}`
                                  : "—"}
                              </div>

                              <div className="text-sm text-slate-300">
                                {formatMoney(player.golfer?.salary)}
                              </div>

                              <div className="text-sm text-slate-300">
                                {player.liveScore?.position ?? "—"}
                              </div>

                              <div
                                className={cn(
                                  "text-sm font-bold",
                                  player.totalScore <= 0
                                    ? "text-emerald-300"
                                    : "text-red-300"
                                )}
                              >
                                {formatScore(player.totalScore)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          <GlassCard className="p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
                  Live Tournament Board
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  DataGolf Feed
                </h2>
              </div>
              <Badge className="border-white/10 bg-white/5 text-slate-300">
                Top 25
              </Badge>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/10">
              <div className="grid grid-cols-[0.45fr_1.4fr_0.7fr_0.7fr] gap-3 border-b border-white/10 bg-black/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <div>Pos</div>
                <div>Player</div>
                <div>Total</div>
                <div>Thru</div>
              </div>

              <div className="divide-y divide-white/10">
                {topLiveScores.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-400">
                    No DataGolf scores found for this tournament yet.
                  </div>
                ) : (
                  topLiveScores.map((score) => (
                    <div
                      key={score.id}
                      className="grid grid-cols-[0.45fr_1.4fr_0.7fr_0.7fr] gap-3 px-4 py-4"
                    >
                      <div className="text-sm font-semibold text-white">
                        {score.position ?? "—"}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {score.player_name ?? "Unknown Player"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Updated {formatDateTime(score.updated_at)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-bold",
                          Number(score.total_score ?? score.score ?? 0) <= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                        )}
                      >
                        {formatScore(score.total_score ?? score.score)}
                      </div>
                      <div className="text-sm text-slate-300">
                        {score.thru ?? "—"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
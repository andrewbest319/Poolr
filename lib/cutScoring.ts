export type LiveScoreLike = {
  total_score?: number | string | null;
  position?: string | number | null;
  status?: string | number | null;
  thru?: string | number | null;
};

export function numericScoreValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(String(value).replace("+", "").replace(",", "").trim());

  return Number.isFinite(numeric) ? numeric : null;
}

function cutLabelFromValue(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  const spaced = raw
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = spaced.replace(/[^a-z0-9]/g, "");

  if (compact === "mc" || spaced === "m c") return "MC";
  if (compact === "cut") return "CUT";
  if (
    compact === "missedcut" ||
    spaced.includes("missed cut") ||
    spaced.includes("missed the cut")
  ) {
    return "CUT";
  }

  return null;
}

function withdrawnOrDisqualifiedFromValue(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return false;

  const spaced = raw
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = spaced.replace(/[^a-z0-9]/g, "");

  return (
    compact === "wd" ||
    compact === "dq" ||
    spaced.includes("withdraw") ||
    spaced.includes("disqual")
  );
}

export function cutStatusLabel(score: LiveScoreLike | null | undefined) {
  if (!score) return null;

  return (
    cutLabelFromValue(score.position) ??
    cutLabelFromValue(score.status) ??
    cutLabelFromValue(score.thru)
  );
}

export function isCutScore(score: LiveScoreLike | null | undefined) {
  return cutStatusLabel(score) !== null;
}

export function isWithdrawnOrDisqualified(
  score: LiveScoreLike | null | undefined
) {
  if (!score) return false;

  return (
    withdrawnOrDisqualifiedFromValue(score.position) ||
    withdrawnOrDisqualifiedFromValue(score.status) ||
    withdrawnOrDisqualifiedFromValue(score.thru)
  );
}

export function liveTotalScore(score: LiveScoreLike | null | undefined) {
  return numericScoreValue(score?.total_score);
}

export function worstNonCutTournamentTotal(scores: LiveScoreLike[]) {
  let worst: number | null = null;

  for (const score of scores) {
    if (isCutScore(score)) continue;
    if (isWithdrawnOrDisqualified(score)) continue;

    const total = liveTotalScore(score);

    if (total === null) continue;

    worst = worst === null ? total : Math.max(worst, total);
  }

  return worst;
}

export function cutAdjustedTournamentTotal(scores: LiveScoreLike[]) {
  const worstNonCut = worstNonCutTournamentTotal(scores);

  return worstNonCut === null ? null : worstNonCut + 1;
}

export function adjustedLiveTotalScore(
  score: LiveScoreLike | null | undefined,
  cutAdjustedTotal: number | null
) {
  if (!score) return null;

  if (isCutScore(score) && cutAdjustedTotal !== null) {
    return cutAdjustedTotal;
  }

  return liveTotalScore(score);
}

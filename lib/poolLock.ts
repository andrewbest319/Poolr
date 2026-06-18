export type LockablePool = {
  is_locked?: boolean | null;
  locked_at?: string | null;
  unlocked_at?: string | null;
};

export type LockableTournament = {
  status?: string | null;
  lock_time?: string | null;
  start_date?: string | null;
  starts_at?: string | null;
  started_at?: string | null;
  start_time?: string | null;
};

export function hasTimeComponent(value: string) {
  return /(?:T|\s)\d{1,2}:\d{2}/.test(value);
}

function cleanTimestamp(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function timestampHasPassed(value: string, nowMs: number) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) && time <= nowMs;
}

export function tournamentStatusLocksPicks(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  return (
    normalized === "locked" ||
    normalized === "live" ||
    normalized === "final" ||
    normalized === "completed"
  );
}

export function getTournamentLockTimestamp(
  tournament: LockableTournament | null | undefined
) {
  const lockTime = cleanTimestamp(tournament?.lock_time);

  if (lockTime) return lockTime;

  const startsAt = cleanTimestamp(tournament?.starts_at);

  if (startsAt && hasTimeComponent(startsAt)) return startsAt;

  const startedAt = cleanTimestamp(tournament?.started_at);

  if (startedAt && hasTimeComponent(startedAt)) return startedAt;

  const startTime = cleanTimestamp(tournament?.start_time);

  if (startTime && hasTimeComponent(startTime)) return startTime;

  const startDate = cleanTimestamp(tournament?.start_date);

  if (startDate && hasTimeComponent(startDate)) return startDate;

  return null;
}

export function isTournamentLocked(
  tournament: LockableTournament | null | undefined,
  nowMs = Date.now()
) {
  const lockTimestamp = getTournamentLockTimestamp(tournament);

  return (
    tournamentStatusLocksPicks(tournament?.status) ||
    (!!lockTimestamp && timestampHasPassed(lockTimestamp, nowMs))
  );
}

export function isPoolManuallyLocked(pool: LockablePool | null | undefined) {
  if (pool?.is_locked === true) return true;

  const lockedAt = cleanTimestamp(pool?.locked_at);

  if (!lockedAt) return false;

  const unlockedAt = cleanTimestamp(pool?.unlocked_at);

  if (unlockedAt) {
    const lockedTime = new Date(lockedAt).getTime();
    const unlockedTime = new Date(unlockedAt).getTime();

    if (Number.isFinite(lockedTime) && Number.isFinite(unlockedTime)) {
      return lockedTime > unlockedTime;
    }
  }

  return true;
}

export function isPoolLocked(
  pool: LockablePool | null | undefined,
  tournament: LockableTournament | null | undefined,
  nowMs = Date.now()
) {
  return isPoolManuallyLocked(pool) || isTournamentLocked(tournament, nowMs);
}

export type DraftFormat = "tiered_draft" | "salary_cap";

export type Pool = {
  id: string;
  code: string;
  poolName: string;
  entryFee: number;
  draftFormat: DraftFormat;
  rosterSize: number;
  playersCounted: number;
  tierRule?: string;
  salaryCap?: number;
  bonusLeader: boolean;
  bonusTop5: boolean;
  bonusTop10: boolean;
  showLiveLeaderboard: boolean;
  allowTrashTalk: boolean;
  hideRostersUntilLock: boolean;
  allowFreePool: boolean;
  createdAt: string;
};

const STORAGE_KEY = "poolr_pools";

export function generatePoolCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export function getPools(): Pool[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Pool[];
  } catch {
    return [];
  }
}

export function savePools(pools: Pool[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
}

export function createPool(poolData: Omit<Pool, "id" | "code" | "createdAt">) {
  const pools = getPools();

  let code = generatePoolCode();
  while (pools.some((pool) => pool.code === code)) {
    code = generatePoolCode();
  }

  const newPool: Pool = {
    ...poolData,
    id: crypto.randomUUID(),
    code,
    createdAt: new Date().toISOString(),
  };

  pools.push(newPool);
  savePools(pools);

  return newPool;
}

export function findPoolByCode(code: string) {
  const pools = getPools();

  return pools.find((pool) => pool.code.toUpperCase() === code.toUpperCase()) || null;
}
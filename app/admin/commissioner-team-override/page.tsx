"use client";

import { useEffect, useMemo, useState } from "react";

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  roster_size: number | string | null;
  salary_cap: number | string | null;
  format: string | null;
};

type Tournament = {
  id: string;
  name: string | null;
  status?: string | null;
};

type PoolrUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  email_normalized?: string | null;
};

type Entry = {
  id: string;
  team_name?: string | null;
  submitted?: boolean | null;
};

type Golfer = {
  id: string;
  player_price_id: string;
  name: string;
  salary: number;
  tier: number;
  win_odds: string | number | null;
  country: string | null;
  datagolf_rank: number | null;
  world_rank: number | null;
};

type Rules = {
  isSalaryCap: boolean;
  rosterSize: number;
  salaryCap: number;
  tierSlots: number[];
  effectiveRosterSize: number;
};

type LoadResponse = {
  ok: boolean;
  error?: string;
  pool?: Pool;
  tournament?: Tournament;
  golfers?: Golfer[];
  rules?: Rules;
  targetUser?: PoolrUser | null;
  existingEntry?: Entry | null;
  selectedGolferIds?: string[];
};

const DEFAULT_POOL_ID = "8d125c40-19ce-423a-a924-733e3a025a0f";
const DEFAULT_TARGET_EMAIL = "taylorangusbest@gmail.com";
const OVERRIDE_WARNING =
  "Commissioner override: this will add/edit a locked team for another user. Use only with permission.";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `$${Number(value).toLocaleString()}`;
}

function searchSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

function rankValue(golfer: Golfer) {
  return golfer.datagolf_rank ?? golfer.world_rank ?? 9999;
}

function firstName(value: string | null | undefined) {
  return String(value ?? "").trim().split(/\s+/)[0] || "";
}

function CommissionerTeamOverridePage() {
  const [adminUserId, setAdminUserId] = useState("");
  const [accessState, setAccessState] = useState<
    "checking" | "authorized" | "blocked"
  >("checking");

  const [poolId, setPoolId] = useState(DEFAULT_POOL_ID);
  const [targetEmail, setTargetEmail] = useState(DEFAULT_TARGET_EMAIL);
  const [teamName, setTeamName] = useState("");
  const [search, setSearch] = useState("");

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [targetUser, setTargetUser] = useState<PoolrUser | null>(null);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function verifyAdmin() {
      if (typeof window === "undefined") return;

      const savedUserId = localStorage.getItem("poolr_user_id") ?? "";

      if (!savedUserId) {
        setError("Unauthorized. Sign in as the Poolr admin account.");
        setAccessState("blocked");
        return;
      }

      setAdminUserId(savedUserId);

      try {
        const res = await fetch("/api/admin/commissioner-team-override", {
          headers: { "x-poolr-user-id": savedUserId },
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as LoadResponse;

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Unauthorized.");
        }

        setAccessState("authorized");
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Unauthorized. Commissioner overrides are admin-only."
        );
        setAccessState("blocked");
      }
    }

    verifyAdmin();
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const golferById = useMemo(
    () => new Map(golfers.map((golfer) => [golfer.id, golfer])),
    [golfers]
  );
  const selectedGolfers = useMemo(
    () =>
      selected
        .map((golferId) => golferById.get(golferId))
        .filter(Boolean) as Golfer[],
    [selected, golferById]
  );
  const salaryUsed = selectedGolfers.reduce(
    (sum, golfer) => sum + Number(golfer.salary ?? 0),
    0
  );
  const salaryLeft = (rules?.salaryCap ?? 0) - salaryUsed;

  const tierCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const golfer of selectedGolfers) {
      const tier = Number(golfer.tier);
      if (!Number.isFinite(tier)) continue;
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
    }

    return counts;
  }, [selectedGolfers]);

  const missingTiers = useMemo(() => {
    if (!rules || rules.isSalaryCap) return [];
    return rules.tierSlots.filter((tier) => !tierCounts.has(tier));
  }, [rules, tierCounts]);

  const duplicateTiers = useMemo(() => {
    if (!rules || rules.isSalaryCap) return [];

    return Array.from(tierCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([tier]) => tier);
  }, [rules, tierCounts]);

  const rosterComplete = rules
    ? rules.isSalaryCap
      ? selected.length === rules.rosterSize
      : selected.length === rules.effectiveRosterSize &&
        missingTiers.length === 0 &&
        duplicateTiers.length === 0
    : false;
  const overSalaryCap = Boolean(
    rules?.isSalaryCap && salaryUsed > rules.salaryCap
  );
  const canSave =
    accessState === "authorized" &&
    Boolean(pool && targetUser && rules) &&
    rosterComplete &&
    !overSalaryCap &&
    !saving;

  const filteredGolfers = useMemo(() => {
    const term = searchSafe(search);
    const list = golfers.filter((golfer) => {
      if (!term) return true;
      return searchSafe(golfer.name).includes(term);
    });

    if (!rules?.isSalaryCap) {
      return [...list].sort(
        (a, b) =>
          Number(a.tier) - Number(b.tier) ||
          rankValue(a) - rankValue(b) ||
          a.name.localeCompare(b.name)
      );
    }

    return [...list].sort(
      (a, b) => b.salary - a.salary || rankValue(a) - rankValue(b)
    );
  }, [golfers, rules, search]);

  function resetLoadedData() {
    setPool(null);
    setTournament(null);
    setTargetUser(null);
    setExistingEntry(null);
    setGolfers([]);
    setRules(null);
    setSelected([]);
  }

  async function loadOverrideData() {
    if (!adminUserId) {
      setError("Unauthorized. Sign in as the Poolr admin account.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    resetLoadedData();

    try {
      const params = new URLSearchParams({
        poolId: poolId.trim(),
        targetEmail: targetEmail.trim(),
      });
      const res = await fetch(
        `/api/admin/commissioner-team-override?${params.toString()}`,
        {
          headers: { "x-poolr-user-id": adminUserId },
          cache: "no-store",
        }
      );
      const data = (await res.json().catch(() => ({}))) as LoadResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not load override data.");
      }

      setPool(data.pool ?? null);
      setTournament(data.tournament ?? null);
      setTargetUser(data.targetUser ?? null);
      setExistingEntry(data.existingEntry ?? null);
      setGolfers(data.golfers ?? []);
      setRules(data.rules ?? null);
      setSelected(data.selectedGolferIds ?? []);

      if (data.existingEntry?.team_name) {
        setTeamName(data.existingEntry.team_name);
      } else if (data.targetUser?.full_name) {
        setTeamName(`${firstName(data.targetUser.full_name)}'s Team`);
      } else {
        setTeamName("Commissioner Override Team");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not load override data."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleGolfer(golfer: Golfer) {
    setError("");
    setNotice("");

    if (selectedSet.has(golfer.id)) {
      setSelected((previous) => previous.filter((id) => id !== golfer.id));
      return;
    }

    if (rules && selected.length >= rules.effectiveRosterSize) {
      setError(
        rules.isSalaryCap
          ? `Select exactly ${rules.rosterSize} golfers. Remove a golfer before adding another.`
          : `Tiered Draft requires exactly ${rules.effectiveRosterSize} golfers. Remove a golfer before adding another.`
      );
      return;
    }

    if (!rules?.isSalaryCap) {
      const tierAlreadyFilled = selectedGolfers.some(
        (selectedGolfer) => Number(selectedGolfer.tier) === Number(golfer.tier)
      );

      if (tierAlreadyFilled) {
        setError(`Tier ${golfer.tier} is already filled.`);
        return;
      }
    }

    setSelected((previous) => [...previous, golfer.id]);
  }

  async function saveOverride() {
    if (!canSave) return;

    if (typeof window !== "undefined" && !window.confirm(OVERRIDE_WARNING)) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/admin/commissioner-team-override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-poolr-user-id": adminUserId,
        },
        body: JSON.stringify({
          poolId: poolId.trim(),
          targetUserEmail: targetEmail.trim(),
          teamName: teamName.trim(),
          selectedGolferIds: selected,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        entryId?: string;
        teamName?: string;
        selectedGolferIds?: string[];
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not save override.");
      }

      setExistingEntry({
        id: data.entryId ?? existingEntry?.id ?? "",
        team_name: data.teamName ?? teamName,
        submitted: true,
      });
      setSelected(data.selectedGolferIds ?? selected);
      setNotice(
        `Commissioner override saved for ${targetEmail.trim()}. The leaderboard will read this team from the normal entries and picks tables.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save override.");
    } finally {
      setSaving(false);
    }
  }

  const statusMessage = useMemo(() => {
    if (!rules) return "Load a pool to validate the roster.";
    if (rules.isSalaryCap && overSalaryCap) return "Over salary cap.";
    if (!rules.isSalaryCap && duplicateTiers.length > 0) {
      return `Duplicate tiers: ${duplicateTiers
        .map((tier) => `Tier ${tier}`)
        .join(", ")}.`;
    }
    if (!rules.isSalaryCap && missingTiers.length > 0) {
      return `Missing ${missingTiers
        .map((tier) => `Tier ${tier}`)
        .join(", ")}.`;
    }
    if (!rosterComplete) {
      return `Selected ${selected.length}/${rules.effectiveRosterSize}.`;
    }
    return "Roster is valid.";
  }, [duplicateTiers, missingTiers, overSalaryCap, rosterComplete, rules, selected.length]);

  if (accessState === "checking") {
    return (
      <main className="min-h-screen bg-[#030712] px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-semibold text-slate-300">
            Checking commissioner access...
          </p>
        </div>
      </main>
    );
  }

  if (accessState === "blocked") {
    return (
      <main className="min-h-screen bg-[#030712] px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-300/25 bg-red-500/10 p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">
            Unauthorized
          </p>
          <h1 className="mt-3 text-3xl font-black">
            Commissioner overrides are admin-only.
          </h1>
          <p className="mt-3 text-sm text-red-100/80">
            {error || "Sign in as the approved Poolr admin account."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
            Admin-only commissioner override
          </p>
          <h1 className="mt-3 text-3xl font-black">
            Add or edit a submitted team after lock
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-yellow-50/80">
            Admin-only commissioner override. This can add or edit another
            user&apos;s team after lock. Normal users remain locked.
          </p>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-yellow-100">
            {OVERRIDE_WARNING}
          </p>
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[1fr_1fr_auto]">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Pool ID
            <input
              value={poolId}
              onChange={(event) => setPoolId(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#07111f] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Target User Email
            <input
              value={targetEmail}
              onChange={(event) => setTargetEmail(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#07111f] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
            />
          </label>
          <button
            type="button"
            onClick={loadOverrideData}
            disabled={loading || !poolId.trim() || !targetEmail.trim()}
            className="self-end rounded-lg border border-emerald-300/30 bg-emerald-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Pool"}
          </button>
        </section>

        {(error || notice) && (
          <section
            className={cn(
              "rounded-2xl border p-4 text-sm font-semibold",
              error
                ? "border-red-300/25 bg-red-500/10 text-red-100"
                : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
            )}
          >
            {error || notice}
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Golfer Picker
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {tournament?.name || "Load a tournament"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {pool?.name || "Pool not loaded"}{" "}
                  {rules
                    ? `- ${rules.isSalaryCap ? "Salary Cap" : "Tiered Draft"}`
                    : ""}
                </p>
              </div>
              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-200 md:w-80">
                Search golfers
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name"
                  className="rounded-lg border border-white/10 bg-[#07111f] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {filteredGolfers.map((golfer) => {
                const selectedNow = selectedSet.has(golfer.id);
                const tierFilled =
                  !rules?.isSalaryCap &&
                  !selectedNow &&
                  selectedGolfers.some(
                    (selectedGolfer) =>
                      Number(selectedGolfer.tier) === Number(golfer.tier)
                  );
                const rosterFull =
                  Boolean(rules) &&
                  !selectedNow &&
                  selected.length >= (rules?.effectiveRosterSize ?? 0);
                const disabled = tierFilled || rosterFull;

                return (
                  <button
                    key={`${golfer.id}-${golfer.player_price_id}`}
                    type="button"
                    onClick={() => toggleGolfer(golfer)}
                    disabled={disabled}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      selectedNow
                        ? "border-emerald-300/45 bg-emerald-300/10"
                        : "border-white/10 bg-[#07111f] hover:border-white/25",
                      disabled && "cursor-not-allowed opacity-45"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {golfer.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          Tier {golfer.tier}
                          {golfer.country ? ` - ${golfer.country}` : ""}
                          {rankValue(golfer) !== 9999
                            ? ` - Rank ${rankValue(golfer)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                          selectedNow
                            ? "border-emerald-300/30 text-emerald-200"
                            : "border-white/10 text-slate-300"
                        )}
                      >
                        {selectedNow ? "Selected" : money(golfer.salary)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Selected Team
              </p>
              <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-200">
                Team Name
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className="rounded-lg border border-white/10 bg-[#07111f] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
                />
              </label>

              <div className="mt-4 space-y-2">
                {selectedGolfers.length === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-[#07111f] p-4 text-sm text-slate-400">
                    No golfers selected yet.
                  </p>
                ) : (
                  selectedGolfers.map((golfer, index) => (
                    <div
                      key={golfer.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#07111f] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {index + 1}. {golfer.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-400">
                          Tier {golfer.tier} - {money(golfer.salary)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleGolfer(golfer)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Validation
              </p>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between rounded-lg bg-[#07111f] p-3">
                  <span className="text-slate-400">Roster</span>
                  <span className="font-black">
                    {selected.length}/{rules?.effectiveRosterSize ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#07111f] p-3">
                  <span className="text-slate-400">Total Salary</span>
                  <span className="font-black">{money(salaryUsed)}</span>
                </div>
                {rules?.isSalaryCap && (
                  <div className="flex justify-between rounded-lg bg-[#07111f] p-3">
                    <span className="text-slate-400">Salary Left</span>
                    <span
                      className={cn(
                        "font-black",
                        salaryLeft < 0 ? "text-red-200" : "text-emerald-200"
                      )}
                    >
                      {money(salaryLeft)}
                    </span>
                  </div>
                )}
                {!rules?.isSalaryCap && rules && (
                  <div className="rounded-lg bg-[#07111f] p-3">
                    <p className="text-slate-400">Tier Requirements</p>
                    <p className="mt-1 font-black">
                      {rules.tierSlots.map((tier) => `Tier ${tier}`).join(", ")}
                    </p>
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-lg border p-3 font-black",
                    rosterComplete && !overSalaryCap
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                      : "border-yellow-300/25 bg-yellow-300/10 text-yellow-100"
                  )}
                >
                  {statusMessage}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-[#07111f] p-3 text-xs leading-5 text-slate-300">
                <p>
                  Target:{" "}
                  <span className="font-black text-white">
                    {targetUser?.email || targetEmail || "Not loaded"}
                  </span>
                </p>
                <p>
                  Existing entry:{" "}
                  <span className="font-black text-white">
                    {existingEntry?.id ? "Yes" : "No"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={saveOverride}
                disabled={!canSave}
                className="mt-4 w-full rounded-lg border border-emerald-300/30 bg-emerald-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Commissioner Override"}
              </button>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default CommissionerTeamOverridePage;

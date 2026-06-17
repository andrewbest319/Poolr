"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type PoolFormat = "Salary Cap" | "Tiered Draft";
type TournamentStatus = "Draft" | "Open" | "Locked" | "Live" | "Final" | "Hidden";
type PaymentMode = "up-front" | "pay-later" | "free";

type Pool = {
  id: string;
  name: string | null;
  tournament_id: string | null;
  creator_poolr_user_id?: string | null;
  creator_demo_user_id?: string | null;
  roster_size: number | null;
  counted_players: number | null;
  salary_cap: number | null;
  format: string | null;
  entry_fee?: number | null;
  max_players?: number | null;
  payment_mode?: string | null;
  premium_enabled?: boolean | null;
  live_leaderboard_enabled?: boolean | null;
  chat_enabled?: boolean | null;
  bonus_points_enabled?: boolean | null;
  hidden_teams_before_lock?: boolean | null;
  invite_code?: string | null;
  payment_status?: string | null;
  purchase_type?: string | null;
  is_locked?: boolean | null;
  locked_at?: string | null;
  unlocked_at?: string | null;
  lock_note?: string | null;
  [key: string]: unknown;
};

type Tournament = {
  id: string;
  name: string | null;
  location: string | null;
  lock_time: string | null;
  status: string | null;
  start_date?: string | null;
  end_date?: string | null;
  [key: string]: unknown;
};

type PoolrUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  email_normalized?: string | null;
  phone: string | null;
  phone_normalized?: string | null;
  has_used_free_pool_experience?: boolean | null;
  marketing_email_opt_in?: boolean | null;
  marketing_sms_opt_in?: boolean | null;
  first_pool_id?: string | null;
  first_entry_id?: string | null;
  last_pool_joined_at?: string | null;
  last_pool_created_at?: string | null;
  created_at?: string | null;
};

type Entry = {
  id: string;
  user_id: string | null;
  poolr_user_id?: string | null;
  pool_id: string;
  submitted: boolean | null;
  team_name?: string | null;
  created_at: string | null;
  paid?: boolean | null;
  payment_status?: string | null;
  [key: string]: unknown;
};

type Member = Entry & {
  poolrUser?: PoolrUser | null;
};

type PayoutRow = {
  id?: string;
  pool_id?: string;
  place: number;
  label: string;
  percentage: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function hasOwn(obj: unknown, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function money(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "$0";
  return `$${n.toLocaleString()}`;
}

function percentage(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0%";
  return `${n}%`;
}

function toTitleStatus(value: string | null | undefined): TournamentStatus {
  const status = String(value ?? "Open").toLowerCase();

  if (status === "draft") return "Draft";
  if (status === "locked") return "Locked";
  if (status === "live") return "Live";
  if (status === "final") return "Final";
  if (status === "hidden") return "Hidden";

  return "Open";
}

function normalizeFormat(value: string | null | undefined): PoolFormat {
  const format = String(value ?? "Salary Cap").toLowerCase();

  if (format.includes("tier")) return "Tiered Draft";

  return "Salary Cap";
}

function dateInputFromTimestamp(value: string | null | undefined) {
  if (!value) return "";

  const raw = String(value);
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);

  return match ? match[0] : "";
}

function timeInputFromTimestamp(value: string | null | undefined) {
  if (!value) return "";

  const raw = String(value);
  const match = raw.match(/(\d{2}):(\d{2})/);

  return match ? `${match[1]}:${match[2]}` : "";
}

function buildTimestamp(date: string, time: string) {
  if (!date || !time) return null;
  return `${date} ${time}:00`;
}

function displayDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function placeLabel(place: number) {
  if (place === 1) return "1st Place";
  if (place === 2) return "2nd Place";
  if (place === 3) return "3rd Place";
  return `${place}th Place`;
}

function generateInviteCode(poolName: string) {
  const base = poolName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  return `${base || "POOLR"}${Math.floor(100 + Math.random() * 900)}`;
}

function cleanInviteCode(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function joinPoolPath(inviteCode: string) {
  const code = cleanInviteCode(inviteCode);

  return code ? `/join-pool?code=${encodeURIComponent(code)}` : "/join-pool";
}

function entryPaymentStatus(entry: Entry) {
  const raw = String(entry.payment_status ?? "").toLowerCase();

  if (raw === "paid") return "Paid";
  if (raw === "unpaid") return "Unpaid";
  if (raw === "pay later" || raw === "pay_later" || raw === "pay-later") {
    return "Pay Later";
  }

  if (entry.paid === true) return "Paid";
  if (entry.paid === false) return "Unpaid";

  return "Untracked";
}

function memberName(member: Member, index = 0) {
  return (
    member.poolrUser?.full_name ||
    member.team_name ||
    `Member ${index + 1}`
  );
}

function memberEmail(member: Member) {
  return member.poolrUser?.email || "No email";
}

function memberPhone(member: Member) {
  return member.poolrUser?.phone || "No phone";
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}

function SectionCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>

      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function ActionButton({
  children,
  variant = "primary",
  className,
  type = "button",
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-white text-slate-950 hover:bg-slate-200"
      : variant === "secondary"
        ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20 hover:bg-emerald-400/25"
        : variant === "danger"
          ? "bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/20 hover:bg-rose-400/25"
          : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-black transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-200">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-400/10"
      />

      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-200">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none transition focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-400/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0b1020] text-white">
            {option.label}
          </option>
        ))}
      </select>

      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-sm font-black text-white">{label}</p>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative mt-0.5 h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-emerald-400/70" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "red" | "yellow" | "cyan";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
        tone === "green" && "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        tone === "red" && "border-rose-300/20 bg-rose-400/10 text-rose-200",
        tone === "yellow" && "border-yellow-300/20 bg-yellow-400/10 text-yellow-100",
        tone === "cyan" && "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
        tone === "default" && "border-white/10 bg-white/5 text-slate-300"
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-black",
          tone === "green" && "text-emerald-300",
          tone === "yellow" && "text-yellow-100",
          tone === "red" && "text-rose-300",
          tone === "default" && "text-white"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-400">{note}</p>
    </div>
  );
}

export default function ManagePoolPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = String(params?.id ?? "");

  const [poolrUserId, setPoolrUserId] = useState("");
  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [accountReady, setAccountReady] = useState(false);

  const [pool, setPool] = useState<Pool | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<Member[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [contactsCopied, setContactsCopied] = useState(false);

  const [poolName, setPoolName] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [location, setLocation] = useState("");
  const [lockDate, setLockDate] = useState("");
  const [lockTime, setLockTime] = useState("");
  const [status, setStatus] = useState<TournamentStatus>("Open");

  const [format, setFormat] = useState<PoolFormat>("Salary Cap");
  const [rosterSize, setRosterSize] = useState("6");
  const [countedPlayers, setCountedPlayers] = useState("4");
  const [salaryCap, setSalaryCap] = useState("50000");

  const [entryFee, setEntryFee] = useState("25");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("pay-later");
  const [maxPlayers, setMaxPlayers] = useState("");

  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [liveLeaderboardEnabled, setLiveLeaderboardEnabled] = useState(true);
  const [bonusPointsEnabled, setBonusPointsEnabled] = useState(true);
  const [hiddenTeamsBeforeLock, setHiddenTeamsBeforeLock] = useState(true);

  const [inviteCode, setInviteCode] = useState("");

  const lockDateTime = useMemo(() => {
    const timestamp = buildTimestamp(lockDate, lockTime);
    if (!timestamp) return null;

    const date = new Date(timestamp.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date;
  }, [lockDate, lockTime]);

  const tournamentStarted = useMemo(() => {
    const lower = String(status ?? "").toLowerCase();

    return (
      lower === "live" ||
      lower === "final" ||
      (!!lockDateTime && lockDateTime.getTime() <= Date.now())
    );
  }, [status, lockDateTime]);

  const manualPoolLocked = pool?.is_locked === true;
  const isLocked = manualPoolLocked || tournamentStarted;

  const isCreator =
    !!pool &&
    !!poolrUserId &&
    (!pool.creator_poolr_user_id || pool.creator_poolr_user_id === poolrUserId);

  useEffect(() => {
    async function requirePoolrAccount() {
      if (typeof window === "undefined") return;

      const savedUserId = localStorage.getItem("poolr_user_id");

      if (!savedUserId) {
        router.replace(
          `/account?returnTo=${encodeURIComponent(`/pool/${poolId}/manage`)}`
        );
        return;
      }

      try {
        const { data, error: accountError } = await supabase
          .from("poolr_users")
          .select("*")
          .eq("id", savedUserId)
          .maybeSingle();

        if (accountError || !data) {
          localStorage.removeItem("poolr_user_id");
          router.replace(
            `/account?returnTo=${encodeURIComponent(`/pool/${poolId}/manage`)}`
          );
          return;
        }

        setPoolrUserId(data.id);
        setPoolrUser(data as PoolrUser);
        setAccountReady(true);
      } catch (err) {
        console.error("Could not load Poolr account:", err);
        localStorage.removeItem("poolr_user_id");
        router.replace(
          `/account?returnTo=${encodeURIComponent(`/pool/${poolId}/manage`)}`
        );
      }
    }

    requirePoolrAccount();
  }, [router, poolId]);

  async function loadManagePage() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .maybeSingle();

      if (poolError) throw new Error(poolError.message);

      if (!poolData) {
        setError("Pool not found.");
        setPool(null);
        return;
      }

      const loadedPool = poolData as Pool;
      setPool(loadedPool);

      setPoolName(loadedPool.name ?? "");
      setFormat(normalizeFormat(loadedPool.format));
      setRosterSize(String(loadedPool.roster_size ?? 6));
      setCountedPlayers(String(loadedPool.counted_players ?? 4));
      setSalaryCap(String(loadedPool.salary_cap ?? 50000));
      setEntryFee(String(loadedPool.entry_fee ?? 25));
      setMaxPlayers(String(loadedPool.max_players ?? ""));

      if (loadedPool.payment_mode) {
        setPaymentMode(String(loadedPool.payment_mode) as PaymentMode);
      }

      setPremiumEnabled(loadedPool.premium_enabled ?? true);
      setLiveLeaderboardEnabled(loadedPool.live_leaderboard_enabled ?? true);
      setChatEnabled(loadedPool.chat_enabled ?? true);
      setBonusPointsEnabled(loadedPool.bonus_points_enabled ?? true);
      setHiddenTeamsBeforeLock(loadedPool.hidden_teams_before_lock ?? true);
      setInviteCode(loadedPool.invite_code ?? generateInviteCode(loadedPool.name ?? "Poolr"));

      if (loadedPool.tournament_id) {
        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", loadedPool.tournament_id)
          .maybeSingle();

        if (tournamentError) throw new Error(tournamentError.message);

        const loadedTournament = (tournamentData as Tournament | null) ?? null;

        setTournament(loadedTournament);
        setTournamentName(loadedTournament?.name ?? "");
        setLocation(loadedTournament?.location ?? "");
        setLockDate(dateInputFromTimestamp(loadedTournament?.lock_time));
        setLockTime(timeInputFromTimestamp(loadedTournament?.lock_time));
        setStatus(toTitleStatus(loadedTournament?.status));
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("entries")
        .select("*")
        .eq("pool_id", loadedPool.id)
        .order("created_at", { ascending: true });

      if (entriesError) throw new Error(entriesError.message);

      const loadedEntries = (entriesData ?? []) as Entry[];
      const userIds = [
        ...new Set(
          loadedEntries
            .map((entry) => entry.poolr_user_id)
            .filter(Boolean) as string[]
        ),
      ];

      let userMap = new Map<string, PoolrUser>();

      if (userIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from("poolr_users")
          .select("*")
          .in("id", userIds);

        if (userError) {
          console.warn("Could not load member account data:", userError.message);
        } else {
          userMap = new Map(
            ((userData ?? []) as PoolrUser[]).map((user) => [user.id, user])
          );
        }
      }

      const mergedMembers: Member[] = loadedEntries.map((entry) => ({
        ...entry,
        poolrUser: entry.poolr_user_id ? userMap.get(entry.poolr_user_id) ?? null : null,
      }));

      setEntries(mergedMembers);

      const { data: payoutsData, error: payoutsError } = await supabase
        .from("payouts")
        .select("*")
        .eq("pool_id", loadedPool.id)
        .order("place", { ascending: true });

      if (!payoutsError) {
        const loadedPayouts = ((payoutsData ?? []) as PayoutRow[]).map((row) => ({
          id: row.id,
          pool_id: row.pool_id,
          place: Number(row.place),
          label: row.label || placeLabel(Number(row.place)),
          percentage: Number(row.percentage ?? 0),
        }));

        setPayouts(loadedPayouts);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load manage page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accountReady || !poolId) return;
    loadManagePage();
  }, [accountReady, poolId]);

  const paidMembersCount = entries.filter((entry) => entryPaymentStatus(entry) === "Paid").length;
  const submittedMembersCount = entries.filter((entry) => entry.submitted).length;
  const accountLinkedCount = entries.filter((entry) => !!entry.poolr_user_id).length;
  const emailOptInCount = entries.filter((entry) => entry.poolrUser?.marketing_email_opt_in !== false).length;
  const smsOptInCount = entries.filter((entry) => entry.poolrUser?.marketing_sms_opt_in === true).length;

  const parsedEntryFee = Number(entryFee || 0);
  const estimatedPot = paymentMode === "free" ? 0 : parsedEntryFee * entries.length;

  const payoutPercentageTotal = useMemo(() => {
    return payouts.reduce((sum, row) => sum + Number(row.percentage || 0), 0);
  }, [payouts]);

  const rosterNumber = Number(rosterSize || 0);
  const countedNumber = Number(countedPlayers || 0);

  const rosterValidation =
    rosterNumber > 0 &&
    countedNumber >= Math.ceil(rosterNumber / 2) &&
    countedNumber <= rosterNumber;

  const allowedCountedOptions = useMemo(() => {
    const roster = Number(rosterSize);
    if (!roster) return [];

    const minimum = Math.ceil(roster / 2);

    return Array.from({ length: roster - minimum + 1 }, (_, index) => {
      const value = minimum + index;
      return {
        label: `${value} players count`,
        value: String(value),
      };
    });
  }, [rosterSize]);

  const normalizedInviteCode = cleanInviteCode(inviteCode);
  const joinPath = joinPoolPath(normalizedInviteCode);
  const inviteLink =
    typeof window !== "undefined" && pool && normalizedInviteCode
      ? `${window.location.origin}${joinPath}`
      : "";

  const contactCsv = useMemo(() => {
    const headers = [
      "Full Name",
      "Team Name",
      "Email",
      "Phone",
      "Email Opt In",
      "SMS Opt In",
      "Payment Status",
      "Submitted",
      "Joined At",
      "Pool Name",
      "Tournament",
    ];

    const rows = entries.map((member, index) => [
      memberName(member, index),
      member.team_name || "",
      memberEmail(member),
      memberPhone(member),
      member.poolrUser?.marketing_email_opt_in !== false ? "Yes" : "No",
      member.poolrUser?.marketing_sms_opt_in === true ? "Yes" : "No",
      entryPaymentStatus(member),
      member.submitted ? "Yes" : "No",
      displayDateTime(member.created_at),
      poolName,
      tournamentName,
    ]);

    return [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");
  }, [entries, poolName, tournamentName]);

  async function copyInviteLink() {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setNotice("Invite link copied.");

    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyContactCsv() {
    if (!contactCsv) return;

    await navigator.clipboard.writeText(contactCsv);
    setContactsCopied(true);
    setNotice("Contact CSV copied.");

    window.setTimeout(() => setContactsCopied(false), 1600);
  }

  function downloadContactCsv() {
    if (typeof window === "undefined") return;

    const blob = new Blob([contactCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeName = (poolName || "poolr_contacts")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName || "poolr"}-contacts.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function addPayoutRow() {
    const nextPlace = payouts.length + 1;

    setPayouts((prev) => [
      ...prev,
      {
        place: nextPlace,
        label: placeLabel(nextPlace),
        percentage: 0,
      },
    ]);
  }

  function updatePayout(index: number, field: "place" | "label" | "percentage", value: string) {
    setPayouts((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: field === "place" || field === "percentage" ? Number(value) : value,
            }
          : row
      )
    );
  }

  function removePayout(index: number) {
    setPayouts((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  }

  async function savePool() {
    if (!pool) return;

    if (!rosterValidation) {
      setError("Roster rule is invalid. Counted players must be between half the roster and the full roster.");
      return;
    }

    if (payouts.length > 0 && payoutPercentageTotal !== 100) {
      setError("Payout percentages must add up to 100%.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const poolUpdate: Record<string, unknown> = {
        name: poolName,
        format,
        roster_size: Number(rosterSize),
        counted_players: Number(countedPlayers),
        salary_cap: format === "Salary Cap" ? Number(salaryCap) : null,
        entry_fee: paymentMode === "free" ? 0 : Number(entryFee),
      };

      if (hasOwn(pool, "max_players")) poolUpdate.max_players = Number(maxPlayers || 0);
      if (hasOwn(pool, "payment_mode")) poolUpdate.payment_mode = paymentMode;
      if (hasOwn(pool, "premium_enabled")) poolUpdate.premium_enabled = premiumEnabled;
      if (hasOwn(pool, "live_leaderboard_enabled")) {
        poolUpdate.live_leaderboard_enabled = liveLeaderboardEnabled;
      }
      if (hasOwn(pool, "chat_enabled")) poolUpdate.chat_enabled = chatEnabled;
      if (hasOwn(pool, "bonus_points_enabled")) {
        poolUpdate.bonus_points_enabled = bonusPointsEnabled;
      }
      if (hasOwn(pool, "hidden_teams_before_lock")) {
        poolUpdate.hidden_teams_before_lock = hiddenTeamsBeforeLock;
      }
      if (hasOwn(pool, "invite_code")) poolUpdate.invite_code = inviteCode;
      if (hasOwn(pool, "creator_poolr_user_id") && !pool.creator_poolr_user_id && poolrUserId) {
        poolUpdate.creator_poolr_user_id = poolrUserId;
      }

      const { error: poolError } = await supabase
        .from("pools")
        .update(poolUpdate)
        .eq("id", pool.id);

      if (poolError) throw new Error(poolError.message);

      // Tournament metadata is controlled by Poolr/DataGolf and stays read-only here.
      // Commissioners manage their own pool settings and manual lock state only.

      const { error: deletePayoutsError } = await supabase
        .from("payouts")
        .delete()
        .eq("pool_id", pool.id);

      if (deletePayoutsError) throw new Error(deletePayoutsError.message);

      if (payouts.length > 0) {
        const payoutInsert = payouts.map((row, index) => ({
          pool_id: pool.id,
          place: Number(row.place || index + 1),
          label: row.label || placeLabel(Number(row.place || index + 1)),
          percentage: Number(row.percentage || 0),
        }));

        const { error: insertPayoutsError } = await supabase
          .from("payouts")
          .insert(payoutInsert);

        if (insertPayoutsError) throw new Error(insertPayoutsError.message);
      }

      setNotice("Pool saved successfully.");
      await loadManagePage();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save pool.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMemberPaid(entry: Entry) {
    const current = entryPaymentStatus(entry);
    const nextPaid = current !== "Paid";

    if (!hasOwn(entry, "payment_status") && !hasOwn(entry, "paid")) {
      setNotice("Payment tracking column is not set up yet. Add payment_status or paid to entries later.");
      return;
    }

    try {
      const update: Record<string, unknown> = {};

      if (hasOwn(entry, "payment_status")) {
        update.payment_status = nextPaid ? "Paid" : "Unpaid";
      } else {
        update.paid = nextPaid;
      }

      const { error: updateError } = await supabase
        .from("entries")
        .update(update)
        .eq("id", entry.id);

      if (updateError) throw new Error(updateError.message);

      await loadManagePage();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update payment status.");
    }
  }

  async function toggleSubmitted(entry: Entry) {
    try {
      const { error: updateError } = await supabase
        .from("entries")
        .update({ submitted: !entry.submitted })
        .eq("id", entry.id);

      if (updateError) throw new Error(updateError.message);

      await loadManagePage();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update submitted status.");
    }
  }

  async function updatePoolLock(action: "lock" | "unlock") {
    if (!pool?.id) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const creatorDemoUserId =
        typeof window !== "undefined"
          ? localStorage.getItem("poolr_demo_user_id") ||
            localStorage.getItem("demo_user_id") ||
            ""
          : "";

      const response = await fetch(`/api/pools/${pool.id}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          creatorPoolrUserId: poolrUserId,
          creatorDemoUserId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update pool lock.");
      }

      setNotice(action === "lock" ? "Pool locked." : "Pool unlocked.");
      await loadManagePage();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update pool lock."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!accountReady || loading) {
    return (
      <main className="min-h-screen bg-[#040816] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-300">
              Poolr Commissioner
            </p>
            <h1 className="mt-3 text-3xl font-black">Loading manage page...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Pulling pool rules, member contacts, payouts, and tournament status.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#040816] p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-red-400/20 bg-red-400/10 p-8">
          <h1 className="text-3xl font-black">Pool not found</h1>
          <p className="mt-3 text-red-100">{error || "This pool could not be loaded."}</p>

          <Link
            href="/create-pool"
            className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black"
          >
            Create Pool
          </Link>
        </div>
      </main>
    );
  }
if (!isCreator) {
  return (
    <main className="min-h-screen bg-[#040816] p-8 text-white">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-yellow-400/20 bg-yellow-400/10 p-8">
        <h1 className="text-3xl font-black">Commissioner access only</h1>
        <p className="mt-3 text-yellow-100">
          This dashboard includes member contact information and can only be viewed by the pool creator.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/pool/${pool.id}`}
            className="inline-flex rounded-2xl bg-white px-5 py-3 font-black text-black"
          >
            Back to Pool Lobby
          </Link>

          <Link
            href={`/pool/${pool.id}/leaderboard`}
            className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-white"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-4%] h-[460px] w-[460px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[25%] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-lg font-black text-emerald-200">
              P
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                Poolr Commissioner
              </p>
              <h1 className="text-xl font-black text-white">Manage Pool</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Account Center
            </Link>

            <Link
              href="/account/settings"
              className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Account Info
            </Link>

            <Link
              href={`/pool/${pool.id}`}
              className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Lobby
            </Link>

            <Link
              href={`/pool/${pool.id}/leaderboard`}
              className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Leaderboard
            </Link>

            <ActionButton variant="primary" onClick={savePool} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </ActionButton>
          </div>
        </div>

        {poolrUser && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <p>
              Managing as <span className="font-black text-white">{poolrUser.full_name}</span>{" "}
              <span className="text-slate-500">• {poolrUser.email}</span>
            </p>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              Commissioner only
            </p>
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
            {notice}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(6,182,212,0.08),rgba(255,255,255,0.02))]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.18fr_0.82fr]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusPill tone={isLocked ? "red" : "green"}>
                  {isLocked ? "Locked" : "Open"}
                </StatusPill>
                <StatusPill>{format}</StatusPill>
                <StatusPill tone="cyan">
                  {entries.length} Member{entries.length === 1 ? "" : "s"}
                </StatusPill>
                {payouts.length > 0 ? (
                  <StatusPill tone={payoutPercentageTotal === 100 ? "green" : "yellow"}>
                    Payouts {percentage(payoutPercentageTotal)}
                  </StatusPill>
                ) : null}
              </div>

              <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
                {poolName || "Untitled Pool"}
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Everything a commissioner needs in one clean place: rules, invite link,
                member status, payouts, contact export, and roster lock control.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ActionButton variant="secondary" onClick={copyInviteLink}>
                  {copied ? "Invite Copied" : "Copy Invite"}
                </ActionButton>

                <Link
                  href={joinPath}
                  className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Test Join Page
                </Link>

                <Link
                  href={`/pool/${pool.id}/build-team`}
                  className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Build Team
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Estimated Pot" value={money(estimatedPot)} note="Entry fee × members" tone="green" />
              <StatCard label="Members" value={entries.length} note={`${accountLinkedCount} account-linked`} />
              <StatCard label="Paid" value={paidMembersCount} note="Marked as paid" />
              <StatCard label="Submitted" value={submittedMembersCount} note="Teams submitted" />
              <StatCard label="Email Contacts" value={emailOptInCount} note="Available in CSV" />
              <StatCard label="SMS Contacts" value={smsOptInCount} note="Opted into texts" tone="yellow" />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <SectionCard title="Pool Setup" subtitle="The only settings a commissioner should need before launch.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Pool Name" value={poolName} onChange={setPoolName} />

                <Select
                  label="Pool Format"
                  value={format}
                  onChange={(value) => setFormat(value as PoolFormat)}
                  options={[
                    { label: "Salary Cap", value: "Salary Cap" },
                    { label: "Tiered Draft", value: "Tiered Draft" },
                  ]}
                />

                <Select
                  label="Roster Size"
                  value={rosterSize}
                  onChange={(value) => {
                    setRosterSize(value);

                    const roster = Number(value);
                    const minimum = Math.ceil(roster / 2);

                    if (Number(countedPlayers) < minimum || Number(countedPlayers) > roster) {
                      setCountedPlayers(String(minimum));
                    }
                  }}
                  options={[
                    { label: "4 Golfers", value: "4" },
                    { label: "6 Golfers", value: "6" },
                    { label: "8 Golfers", value: "8" },
                    { label: "10 Golfers", value: "10" },
                  ]}
                />

                <Select
                  label="Best Count"
                  value={countedPlayers}
                  onChange={setCountedPlayers}
                  options={allowedCountedOptions}
                  hint="This many golfers count toward each team score."
                />

                {format === "Salary Cap" ? (
                  <Input
                    label="Salary Cap"
                    value={salaryCap}
                    onChange={setSalaryCap}
                    type="number"
                    hint="Fake budget each team can spend on golfers."
                  />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">Tiered Draft</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Players draft one golfer from each tier. Salary cap is hidden for this format.
                    </p>
                  </div>
                )}

                <Input
                  label="Max Members"
                  value={maxPlayers}
                  onChange={setMaxPlayers}
                  type="number"
                  hint="Leave blank or 0 for unlimited members."
                />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-black text-white">Roster Rule</p>
                <p
                  className={cn(
                    "mt-2 text-sm font-bold",
                    rosterValidation ? "text-emerald-300" : "text-rose-300"
                  )}
                >
                  {rosterValidation
                    ? `${countedNumber} of ${rosterNumber} golfers will count. This rule is ready.`
                    : `Counted golfers must be at least ${Math.ceil(rosterNumber / 2)} and no more than ${rosterNumber}.`}
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Tournament" subtitle="Tournament details are shown here for context and stay consistent across Poolr.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tournament</p>
                  <p className="mt-2 text-lg font-black text-white">{tournamentName || "Not connected"}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</p>
                  <p className="mt-2 text-lg font-black text-white">{location || "Not set"}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tournament Status</p>
                  <p className="mt-2 text-lg font-black text-white">{status}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scheduled Lock</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {buildTimestamp(lockDate, lockTime)
                      ? displayDateTime(buildTimestamp(lockDate, lockTime))
                      : "Not set"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                <p className="text-sm font-black text-emerald-200">Commissioner control</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Use Pool Lock to close or reopen this specific pool before tournament start.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Entry Fee & Payouts" subtitle="Organize group payments and prize places. Poolr does not process prize money.">
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Entry Fee"
                  value={entryFee}
                  onChange={setEntryFee}
                  type="number"
                  hint="Set to 0 for a free group pool."
                />

                <Select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(value) => setPaymentMode(value as PaymentMode)}
                  options={[
                    { label: "Up Front", value: "up-front" },
                    { label: "Pay Later", value: "pay-later" },
                    { label: "Free Pool", value: "free" },
                  ]}
                />

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estimated Pot</p>
                  <p className="mt-2 text-2xl font-black text-emerald-300">{money(estimatedPot)}</p>
                  <p className="mt-1 text-sm text-slate-400">Based on current members.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-black text-white">Payout Structure</p>
                  <p
                    className={cn(
                      "mt-1 text-sm font-bold",
                      payoutPercentageTotal === 100 || payouts.length === 0
                        ? "text-emerald-300"
                        : "text-rose-300"
                    )}
                  >
                    Total configured payout: {percentage(payoutPercentageTotal)}
                  </p>
                </div>

                <ActionButton variant="secondary" onClick={addPayoutRow}>
                  Add Payout Row
                </ActionButton>
              </div>

              <div className="mt-4 space-y-3">
                {payouts.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                    No payouts set yet. Add payout rows if this pool has prize places.
                  </div>
                ) : (
                  payouts.map((row, index) => {
                    const projected = Math.round((estimatedPot * Number(row.percentage || 0)) / 100);

                    return (
                      <div
                        key={`${row.id ?? "new"}-${index}`}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[110px_1fr_140px_140px_auto]"
                      >
                        <Input
                          label="Place"
                          value={row.place}
                          onChange={(value) => updatePayout(index, "place", value)}
                          type="number"
                        />

                        <Input
                          label="Label"
                          value={row.label}
                          onChange={(value) => updatePayout(index, "label", value)}
                        />

                        <Input
                          label="Percent"
                          value={row.percentage}
                          onChange={(value) => updatePayout(index, "percentage", value)}
                          type="number"
                        />

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Projected</p>
                          <p className="mt-2 font-black text-emerald-300">{money(projected)}</p>
                        </div>

                        <div className="flex items-end">
                          <ActionButton
                            variant="danger"
                            className="w-full"
                            onClick={() => removePayout(index)}
                          >
                            Remove
                          </ActionButton>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Members"
              subtitle="Track team status, payment status, and contact information for this pool."
              right={
                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="ghost" onClick={copyContactCsv}>
                    {contactsCopied ? "Copied" : "Copy CSV"}
                  </ActionButton>
                  <ActionButton variant="secondary" onClick={downloadContactCsv}>
                    Download CSV
                  </ActionButton>
                </div>
              }
            >
              <div className="space-y-3">
                {entries.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                    No members have joined this pool yet.
                  </div>
                ) : (
                  entries.map((entry, index) => {
                    const statusText = entryPaymentStatus(entry);
                    const user = entry.poolrUser;

                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-white">
                              {memberName(entry, index)}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              Team: {entry.team_name || "No team name yet"}
                            </p>

                            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                              <p className="truncate">
                                <span className="text-slate-500">Email:</span>{" "}
                                {memberEmail(entry)}
                              </p>
                              <p className="truncate">
                                <span className="text-slate-500">Phone:</span>{" "}
                                {memberPhone(entry)}
                              </p>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              Joined {displayDateTime(entry.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={user ? "green" : "yellow"}>
                              {user ? "Account Linked" : "No Account"}
                            </StatusPill>

                            <StatusPill tone={user?.marketing_email_opt_in !== false ? "green" : "default"}>
                              Email {user?.marketing_email_opt_in !== false ? "Yes" : "No"}
                            </StatusPill>

                            <StatusPill tone={user?.marketing_sms_opt_in === true ? "green" : "default"}>
                              SMS {user?.marketing_sms_opt_in === true ? "Yes" : "No"}
                            </StatusPill>

                            <button
                              type="button"
                              onClick={() => toggleSubmitted(entry)}
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-black transition",
                                entry.submitted
                                  ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30"
                                  : "bg-white/10 text-slate-300 ring-1 ring-white/10"
                              )}
                            >
                              {entry.submitted ? "Submitted" : "Not Submitted"}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleMemberPaid(entry)}
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-black transition",
                                statusText === "Paid"
                                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
                                  : statusText === "Untracked"
                                    ? "bg-yellow-500/15 text-yellow-100 ring-1 ring-yellow-400/30"
                                    : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30"
                              )}
                            >
                              {statusText}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Invite Link" subtitle="Share this with members so they can join and build a team.">
              <div className="space-y-4">
                <Input
                  label="Invite Code"
                  value={inviteCode}
                  onChange={(value) => setInviteCode(value.toUpperCase())}
                  hint="Short code players can use to join this pool."
                />

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Invite Link</p>
                  <p className="mt-2 break-all text-sm font-bold text-white">
                    {inviteLink || "Loading invite link..."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton variant="secondary" onClick={copyInviteLink}>
                      {copied ? "Copied" : "Copy Invite Link"}
                    </ActionButton>

                    <Link
                      href={joinPath}
                      className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
                    >
                      Test Join Page
                    </Link>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Pool Lock" subtitle="Close or reopen roster editing for this specific pool.">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">
                      {isLocked ? "Pool Locked" : "Pool Open"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Locking stops members from joining or editing teams. You can unlock before tournament start.
                    </p>
                  </div>

                  <StatusPill tone={isLocked ? "red" : "green"}>
                    {tournamentStarted
                      ? "Tournament Lock"
                      : manualPoolLocked
                        ? "Manual Lock"
                        : "Open"}
                  </StatusPill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ActionButton
                    variant="danger"
                    onClick={() => updatePoolLock("lock")}
                    disabled={saving || manualPoolLocked || tournamentStarted || !isCreator}
                    className="w-full"
                  >
                    {manualPoolLocked ? "Locked" : "Lock Pool"}
                  </ActionButton>

                  <ActionButton
                    variant="secondary"
                    onClick={() => updatePoolLock("unlock")}
                    disabled={saving || !manualPoolLocked || tournamentStarted || !isCreator}
                    className="w-full"
                  >
                    {tournamentStarted ? "Unlock Closed" : "Unlock Pool"}
                  </ActionButton>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {tournamentStarted
                    ? "Tournament has started, so teams are locked."
                    : manualPoolLocked
                      ? "Pool is manually locked. You can reopen it before tournament start."
                      : "Pool is open. Members can join and edit picks before lock."}
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Member Export" subtitle="Use this to keep commissioner records outside Poolr.">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard label="Email Contacts" value={emailOptInCount} note="Included in export" tone="green" />
                  <StatCard label="SMS Contacts" value={smsOptInCount} note="Opted into texts" tone="yellow" />
                </div>

                <ActionButton variant="secondary" onClick={downloadContactCsv} className="w-full">
                  Download Contact CSV
                </ActionButton>
              </div>
            </SectionCard>

            <SectionCard title="Navigation" subtitle="Jump to the pages a commissioner uses most.">
              <div className="grid gap-3">
                <Link
                  href={`/pool/${pool.id}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                >
                  Pool Lobby
                </Link>

                <Link
                  href={`/pool/${pool.id}/leaderboard`}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-400/15 px-4 py-3 text-sm font-black text-emerald-200 ring-1 ring-emerald-300/20 transition hover:bg-emerald-400/25"
                >
                  Leaderboard
                </Link>

                <Link
                  href="/account"
                  className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Account Center
                </Link>

                <Link
                  href="/account/settings"
                  className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-4 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Account Information
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { supabase } from "../../lib/supabase";

type DraftFormat = "tiered_draft" | "salary_cap";

type Tournament = {
  id: string;
  name: string;
  slug?: string | null;
  tour?: string | null;
  location: string | null;
  course?: string | null;
  start_date: string | null;
  end_date: string | null;
  lock_time: string | null;
  status: string | null;
  is_major?: boolean | null;
  is_signature?: boolean | null;
  event_tier?: string | null;
  is_featured?: boolean | null;
  feature_label?: string | null;
  display_priority?: number | null;
};

type PoolrUser = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

type CreatedPool = {
  id: string;
  invite_code: string | null;
};

const CREATE_POOL_PATH = "/create-pool";
const ROSTER_OPTIONS = [4, 6, 8, 10] as const;
const MAX_PLAYER_OPTIONS = [8, 10, 12, 16, 20, 24, 32, 40, 50] as const;
const SALARY_CAP_OPTIONS = [50000, 75000, 100000] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

function getMinCount(rosterSize: number) {
  return Math.ceil(rosterSize / 2);
}

function getCountedOptions(rosterSize: number) {
  const min = getMinCount(rosterSize);
  return Array.from({ length: rosterSize - min + 1 }, (_, index) => min + index);
}

function getOrCreateLocalCreatorId() {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem("poolr_creator_demo_user_id");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("poolr_creator_demo_user_id", id);
  }

  return id;
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return null;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string | null | undefined) {
  if (!dateString) return null;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTournamentMeta(tournament: Tournament | null) {
  if (!tournament) return "Select a tournament";

  const parts: string[] = [];

  if (tournament.course) parts.push(tournament.course);
  if (tournament.location) parts.push(tournament.location);

  const start = formatDate(tournament.start_date || tournament.lock_time);
  const end = formatDate(tournament.end_date);

  if (start && end && start !== end) {
    parts.push(`${start} – ${end}`);
  } else if (start) {
    parts.push(start);
  }

  return parts.join(" • ") || "Tournament details loading";
}

function getTournamentSortTime(tournament: Tournament) {
  const value = tournament.start_date || tournament.lock_time || "9999-12-31";
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? Number.MAX_SAFE_INTEGER
    : parsed.getTime();
}

function sortTournaments(a: Tournament, b: Tournament) {
  const featuredA = a.is_featured || a.is_major ? 0 : 1;
  const featuredB = b.is_featured || b.is_major ? 0 : 1;

  if (featuredA !== featuredB) return featuredA - featuredB;

  const priorityA = a.display_priority ?? 100;
  const priorityB = b.display_priority ?? 100;

  if (priorityA !== priorityB) return priorityA - priorityB;

  return getTournamentSortTime(a) - getTournamentSortTime(b);
}

function getTournamentLabel(tournament: Tournament) {
  if (tournament.feature_label) return tournament.feature_label;
  if (tournament.is_major) return "Major";
  if (tournament.is_signature) return "Signature";
  if (tournament.tour) return tournament.tour;
  return "Event";
}

function formatCurrency(value: string | number) {
  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value || "0"));

  if (!Number.isFinite(numberValue) || numberValue <= 0) return "$0";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function displayFormat(format: DraftFormat) {
  return format === "tiered_draft" ? "Tiered Draft" : "Salary Cap";
}

function formatCap(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return "$50K";
  return `$${Math.round(parsed / 1000)}K`;
}

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "success" | "muted" | "gold" | "dark";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]",
        tone === "success" &&
          "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
        tone === "gold" && "border-amber-300/25 bg-amber-300/10 text-amber-200",
        tone === "dark" && "border-white/10 bg-black/25 text-neutral-300",
        tone === "muted" && "border-white/10 bg-white/[0.04] text-neutral-400"
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
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[32px] border border-white/10 bg-white/[0.055] shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          {subtitle}
        </p>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-white">{label}</span>
        {hint ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[22px] border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60",
        props.className
      )}
    />
  );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-[22px] border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15",
        props.className
      )}
    />
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="group flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-black/20 p-4 text-left transition hover:border-emerald-300/30 hover:bg-emerald-400/5"
    >
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-neutral-400">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition",
          checked
            ? "border-emerald-300/40 bg-emerald-400/80"
            : "border-white/10 bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-6" : "left-1"
          )}
        />
      </span>
    </button>
  );
}

function FormatCard({
  title,
  badge,
  description,
  selected,
  onClick,
}: {
  title: string;
  badge?: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[30px] border p-6 text-left transition",
        selected
          ? "border-emerald-300/45 bg-emerald-400/[0.13] shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.055]"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-6 top-0 h-px",
          selected ? "bg-emerald-300/60" : "bg-white/10"
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-black text-white">{title}</h3>
        {selected ? <Badge tone="success">Selected</Badge> : null}
      </div>
      {badge ? <div className="mt-4"><Badge tone="gold">{badge}</Badge></div> : null}
      <p className="mt-4 text-sm leading-6 text-neutral-400">{description}</p>
    </button>
  );
}

function TournamentCard({
  tournament,
  isSelected,
  onClick,
}: {
  tournament: Tournament;
  isSelected: boolean;
  onClick: () => void;
}) {
  const lockDate = formatDate(tournament.lock_time || tournament.start_date);
  const lockTime = formatTime(tournament.lock_time);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[26px] border p-5 text-left transition",
        isSelected
          ? "border-emerald-300/45 bg-emerald-400/[0.12]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.055]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone={tournament.is_major ? "gold" : "dark"}>
            {getTournamentLabel(tournament)}
          </Badge>
          <h3 className="mt-4 text-xl font-black tracking-tight text-white">
            {tournament.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            {formatTournamentMeta(tournament)}
          </p>
        </div>
        {isSelected ? <Badge tone="success">Chosen</Badge> : null}
      </div>
      {lockDate ? (
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
          Locks {lockDate}
          {lockTime ? ` • ${lockTime}` : ""}
        </p>
      ) : null}
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </span>
      <span className="max-w-[55%] text-right text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

export default function CreatePoolPage() {
  const router = useRouter();

  const [poolrUserId, setPoolrUserId] = useState("");
  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [loadingPoolrUser, setLoadingPoolrUser] = useState(true);

  const [poolName, setPoolName] = useState("");
  const [entryFee, setEntryFee] = useState("25");
  const [draftFormat, setDraftFormat] = useState<DraftFormat>("tiered_draft");

  const [rosterSize, setRosterSize] = useState<number>(6);
  const countedOptions = useMemo(() => getCountedOptions(rosterSize), [rosterSize]);
  const [playersCounted, setPlayersCounted] = useState<number>(4);

  const [tierRule, setTierRule] = useState("1 player from each tier");
  const [salaryCap, setSalaryCap] = useState("50000");
  const [maxPlayers, setMaxPlayers] = useState("25");

  const [bonusLeader, setBonusLeader] = useState(true);
  const [bonusTop5, setBonusTop5] = useState(true);
  const [bonusTop10, setBonusTop10] = useState(true);

  const [showLiveLeaderboard, setShowLiveLeaderboard] = useState(true);
  const [allowTrashTalk, setAllowTrashTalk] = useState(true);
  const [hideRostersUntilLock, setHideRostersUntilLock] = useState(true);
  const [allowFreePool, setAllowFreePool] = useState(false);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [creatorDemoUserId, setCreatorDemoUserId] = useState("");
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [createdCode, setCreatedCode] = useState("");
  const [createdInviteLink, setCreatedInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function requirePoolrAccount() {
      if (typeof window === "undefined") return;

      const savedUserId = localStorage.getItem("poolr_user_id");

      if (!savedUserId) {
        router.replace(`/account?returnTo=${encodeURIComponent(CREATE_POOL_PATH)}`);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("poolr_users")
          .select("*")
          .eq("id", savedUserId)
          .maybeSingle();

        if (error || !data) {
          localStorage.removeItem("poolr_user_id");
          router.replace(`/account?returnTo=${encodeURIComponent(CREATE_POOL_PATH)}`);
          return;
        }

        setPoolrUserId(savedUserId);
        setPoolrUser(data as PoolrUser);
      } catch (error) {
        console.error("Failed to verify Poolr account:", error);
        localStorage.removeItem("poolr_user_id");
        router.replace(`/account?returnTo=${encodeURIComponent(CREATE_POOL_PATH)}`);
      } finally {
        setLoadingPoolrUser(false);
      }
    }

    requirePoolrAccount();
  }, [router]);

  useEffect(() => {
    const min = getMinCount(rosterSize);

    if (playersCounted < min || playersCounted > rosterSize) {
      setPlayersCounted(Math.min(Math.max(4, min), rosterSize));
    }
  }, [rosterSize, playersCounted]);

  useEffect(() => {
    const demoId = getOrCreateLocalCreatorId();
    setCreatorDemoUserId(demoId);
  }, []);

  useEffect(() => {
    async function loadTournaments() {
      setLoadingTournaments(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Failed to load tournaments:", error);
        setErrorMessage("Could not load tournaments.");
        setLoadingTournaments(false);
        return;
      }

      const visibleRows = ((data ?? []) as Tournament[])
        .filter((tournament) => {
          const status = String(tournament.status ?? "").toLowerCase();
          return status !== "hidden" && status !== "archived";
        })
        .sort(sortTournaments);

      setTournaments(visibleRows);

      if (visibleRows.length > 0) {
        const preferred =
          visibleRows.find((tournament) => tournament.slug === "2026-us-open") ??
          visibleRows.find((tournament) => tournament.is_featured) ??
          visibleRows.find((tournament) => tournament.is_major) ??
          visibleRows[0];

        setSelectedTournamentId(preferred.id);
      }

      setLoadingTournaments(false);
    }

    loadTournaments();
  }, []);

  const selectedTournament =
    tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null;

  const featuredTournaments = useMemo(() => {
    const preferred = tournaments
      .filter((tournament) => tournament.is_featured || tournament.is_major)
      .sort(sortTournaments);

    const fallback = tournaments.slice(0, 3);

    return (preferred.length > 0 ? preferred : fallback).slice(0, 3);
  }, [tournaments]);

  const selectedTournamentMeta = formatTournamentMeta(selectedTournament);
  const bonusCount = [bonusLeader, bonusTop5, bonusTop10].filter(Boolean).length;
  const previewJoinLink =
    createdCode && typeof window !== "undefined"
      ? `${window.location.origin}/join-pool?code=${encodeURIComponent(createdCode)}`
      : "";

  async function handleCopyCode() {
    if (!createdCode) return;

    const textToCopy = createdInviteLink || previewJoinLink || createdCode;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy invite:", error);
    }
  }

  async function createUniqueInviteCode() {
    let code = generateInviteCode();
    let attempts = 0;

    while (attempts < 8) {
      const { data, error } = await supabase
        .from("pools")
        .select("id")
        .eq("invite_code", code)
        .maybeSingle();

      if (error) {
        console.error("Invite code check failed:", error);
        break;
      }

      if (!data) return code;

      code = generateInviteCode();
      attempts += 1;
    }

    return code;
  }

  function validateForm() {
    if (!poolrUserId) return "Create your Poolr account before creating a pool.";
    if (!poolName.trim()) return "Enter a pool name.";
    if (!selectedTournamentId) return "Select a tournament.";

    if (!allowFreePool && Number(entryFee) < 0) {
      return "Entry fee cannot be negative.";
    }

    if (playersCounted < getMinCount(rosterSize)) {
      return `At least ${getMinCount(rosterSize)} players must count for this roster size.`;
    }

    if (playersCounted > rosterSize) {
      return "Players counted cannot be greater than roster size.";
    }

    return "";
  }

  async function insertPoolWithFallback(payload: Record<string, unknown>) {
    const attempts = [
      payload,
      {
        name: payload.name,
        format: payload.format,
        entry_fee: payload.entry_fee,
        roster_size: payload.roster_size,
        counted_players: payload.counted_players,
        salary_cap: payload.salary_cap,
        invite_code: payload.invite_code,
        tournament_id: payload.tournament_id,
        creator_poolr_user_id: payload.creator_poolr_user_id,
        creator_demo_user_id: payload.creator_demo_user_id,
        payment_status: payload.payment_status,
        purchase_type: payload.purchase_type,
      },
      {
        name: payload.name,
        format: payload.format,
        entry_fee: payload.entry_fee,
        roster_size: payload.roster_size,
        counted_players: payload.counted_players,
        salary_cap: payload.salary_cap,
        invite_code: payload.invite_code,
        tournament_id: payload.tournament_id,
        creator_poolr_user_id: payload.creator_poolr_user_id,
        creator_demo_user_id: payload.creator_demo_user_id,
      },
      {
        name: payload.name,
        format: payload.format,
        entry_fee: payload.entry_fee,
        roster_size: payload.roster_size,
        counted_players: payload.counted_players,
        salary_cap: payload.salary_cap,
        invite_code: payload.invite_code,
        tournament_id: payload.tournament_id,
      },
      {
        name: payload.name,
        format: payload.format,
        entry_fee: payload.entry_fee,
        roster_size: payload.roster_size,
        counted_players: payload.counted_players,
        salary_cap: payload.salary_cap,
        invite_code: payload.invite_code,
      },
    ];

    let lastError: unknown = null;

    for (const attempt of attempts) {
      const { data, error } = await supabase
        .from("pools")
        .insert(attempt)
        .select("id, invite_code")
        .single();

      if (!error && data) {
        return data as CreatedPool;
      }

      lastError = error;
      console.warn("Pool insert attempt failed:", error);
    }

    throw new Error(
      typeof lastError === "object" &&
        lastError !== null &&
        "message" in lastError
        ? String((lastError as { message?: string }).message)
        : "Failed to create pool."
    );
  }

  async function saveOptionalFeatureSettings(poolId: string) {
    const optionalPayload = {
      premium_enabled: true,
      live_leaderboard_enabled: showLiveLeaderboard,
      chat_enabled: allowTrashTalk,
      bonus_points_enabled: bonusLeader || bonusTop5 || bonusTop10,
      hidden_teams_before_lock: hideRostersUntilLock,
      payment_mode: allowFreePool ? "free" : "pay-later",
    };

    const { error } = await supabase
      .from("pools")
      .update(optionalPayload)
      .eq("id", poolId);

    if (error) {
      console.warn("Optional premium fields were not saved:", error.message);
    }
  }

  async function handleCreatePool() {
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const inviteCode = await createUniqueInviteCode();
      const groupEntryFee = allowFreePool ? 0 : Number.parseFloat(entryFee || "0");

      const payload = {
        name: poolName.trim(),
        format: draftFormat,
        entry_fee: Number.isFinite(groupEntryFee) ? groupEntryFee : 0,
        roster_size: rosterSize,
        counted_players: playersCounted,
        salary_cap: draftFormat === "salary_cap" ? Number.parseInt(salaryCap, 10) : null,
        max_entries: Number.parseInt(maxPlayers, 10),
        max_players: Number.parseInt(maxPlayers, 10),
        tier_rule: draftFormat === "tiered_draft" ? tierRule : null,
        invite_code: inviteCode,
        tournament_id: selectedTournamentId,
        creator_poolr_user_id: poolrUserId,
        creator_demo_user_id: creatorDemoUserId,
        payment_status: "setup_created",
        billing_status: "pricing_pending",
        premium_unlocked_reason: "pool_setup_started",
        created_by_free_experience: false,
        purchase_type: "pricing_pending",
      };

      const createdPool = await insertPoolWithFallback(payload);
      await saveOptionalFeatureSettings(createdPool.id);

      const finalInviteCode = createdPool.invite_code || inviteCode;
      const inviteLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/join-pool?code=${encodeURIComponent(
              finalInviteCode
            )}`
          : `/join-pool?code=${encodeURIComponent(finalInviteCode)}`;

      setCreatedCode(finalInviteCode);
      setCreatedInviteLink(inviteLink);
      setSuccessMessage("Pool created. Sending you to pick golfers...");

      window.setTimeout(() => {
        router.push(`/pool/${createdPool.id}/build-team`);
      }, 650);
    } catch (error) {
      console.error("Failed to create pool:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your pool."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.20),transparent_25%),radial-gradient(circle_at_92%_15%,rgba(59,130,246,0.16),transparent_22%),linear-gradient(to_bottom,#040816,#071221_42%,#040816)]" />
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[150px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div className="min-w-0">
              <div className="mb-6 rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="success">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Manager Setup
                  </Badge>
                  <Badge tone="dark">Rules first</Badge>
                  <Badge tone="dark">Pricing later</Badge>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
                  <div>
                    <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                      Build the pool your group actually wants to play.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
                      Set the format, scoring, tournament, and experience in one clean setup.
                      After this, you pick golfers, finalize the team board, then choose the Poolr access plan.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-emerald-300/20 bg-emerald-400/[0.08] p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      Recommended flow
                    </p>
                    <p className="mt-3 text-sm leading-6 text-neutral-300">
                      Create Pool → Pick Golfers → Pricing → Live Leaderboard
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <GlassCard className="p-6 sm:p-7">
                  <SectionHeader
                    eyebrow="Step 1"
                    title="Draft Format"
                    subtitle="Tiered Draft is first because it is the easiest, fairest, and most common setup for friend groups and tournament pools."
                    right={<Badge tone="gold">Most important</Badge>}
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <FormatCard
                      title="Tiered Draft"
                      badge="Most commonly used"
                      description="Golfers are grouped into tiers and each participant picks from each tier. Simple, clean, fair, and perfect for most tournament pools."
                      selected={draftFormat === "tiered_draft"}
                      onClick={() => setDraftFormat("tiered_draft")}
                    />

                    <FormatCard
                      title="Salary Cap"
                      description="Each participant gets a fake budget and builds a roster by spending on golfers. More strategic and better for advanced groups."
                      selected={draftFormat === "salary_cap"}
                      onClick={() => setDraftFormat("salary_cap")}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <Field label="Roster Size" hint="max 10">
                      <SelectInput
                        value={rosterSize}
                        onChange={(event) => setRosterSize(Number(event.target.value))}
                      >
                        {ROSTER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option} golfers
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    <Field label="Players Counted" hint="best scores">
                      <SelectInput
                        value={playersCounted}
                        onChange={(event) => setPlayersCounted(Number(event.target.value))}
                      >
                        {countedOptions.map((option) => (
                          <option key={option} value={option}>
                            Best {option} count
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    {draftFormat === "tiered_draft" ? (
                      <Field label="Tier Rule" hint="default">
                        <TextInput
                          value={tierRule}
                          onChange={(event) => setTierRule(event.target.value)}
                        />
                      </Field>
                    ) : (
                      <Field label="Salary Cap" hint="fake money">
                        <SelectInput
                          value={salaryCap}
                          onChange={(event) => setSalaryCap(event.target.value)}
                        >
                          {SALARY_CAP_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {formatCurrency(option)}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-6 sm:p-7">
                  <SectionHeader
                    eyebrow="Step 2"
                    title="Scoring and Experience"
                    subtitle="Turn a basic golf pool into something that feels live, competitive, and worth checking throughout the tournament."
                  />

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                      <p className="text-sm font-black text-white">Bonus scoring</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        Add extra energy for players near the top of the board each round.
                      </p>
                      <div className="mt-4 space-y-3">
                        <Toggle
                          label="Round leader bonus"
                          description="Reward a golfer leading after a round."
                          checked={bonusLeader}
                          onChange={() => setBonusLeader((previous) => !previous)}
                        />
                        <Toggle
                          label="Top 5 bonus"
                          description="Reward golfers pushing near the top."
                          checked={bonusTop5}
                          onChange={() => setBonusTop5((previous) => !previous)}
                        />
                        <Toggle
                          label="Top 10 bonus"
                          description="Give more teams something to watch."
                          checked={bonusTop10}
                          onChange={() => setBonusTop10((previous) => !previous)}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                      <p className="text-sm font-black text-white">Pool energy</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        Keep the pool private before lock and alive once the tournament starts.
                      </p>
                      <div className="mt-4 space-y-3">
                        <Toggle
                          label="Live leaderboard"
                          description="Give the group a premium live standings view."
                          checked={showLiveLeaderboard}
                          onChange={() => setShowLiveLeaderboard((previous) => !previous)}
                        />
                        <Toggle
                          label="Pool chat / trash talk"
                          description="Let the group react during the tournament."
                          checked={allowTrashTalk}
                          onChange={() => setAllowTrashTalk((previous) => !previous)}
                        />
                        <Toggle
                          label="Hide rosters until lock"
                          description="No one sees anyone else's team before the tournament starts."
                          checked={hideRostersUntilLock}
                          onChange={() => setHideRostersUntilLock((previous) => !previous)}
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6 sm:p-7">
                  <SectionHeader
                    eyebrow="Step 3"
                    title="Pool Basics"
                    subtitle="Keep the manager setup simple: name the pool, choose the group size, and decide whether your group buy-in is shown or set to free."
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Field label="Pool Name" hint="required">
                        <TextInput
                          value={poolName}
                          onChange={(event) => setPoolName(event.target.value)}
                          placeholder="Example: Sunday Major Pool"
                        />
                      </Field>
                    </div>

                    <Field label="Max Entries" hint="optional">
                      <SelectInput
                        value={maxPlayers}
                        onChange={(event) => setMaxPlayers(event.target.value)}
                      >
                        {MAX_PLAYER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option} entries
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    <Field label="Group Buy-In" hint="display only">
                      <TextInput
                        type="number"
                        min="0"
                        step="1"
                        value={entryFee}
                        disabled={allowFreePool}
                        onChange={(event) => setEntryFee(event.target.value)}
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <Toggle
                        label="Free group pool"
                        description="Set the displayed group buy-in to $0. Poolr pricing is handled after golfers are selected."
                        checked={allowFreePool}
                        onChange={() => setAllowFreePool((previous) => !previous)}
                      />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6 sm:p-7">
                  <SectionHeader
                    eyebrow="Step 4"
                    title="Tournament"
                    subtitle="Featured events show first. Use the dropdown if the manager wants a different tournament."
                    right={
                      <Badge tone="muted">
                        {loadingTournaments
                          ? "Loading"
                          : `${tournaments.length} event${tournaments.length === 1 ? "" : "s"}`}
                      </Badge>
                    }
                  />

                  <div className="mt-6 space-y-5">
                    {loadingTournaments ? (
                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-neutral-400">
                        Loading tournaments...
                      </div>
                    ) : tournaments.length === 0 ? (
                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-neutral-400">
                        No tournaments available yet. Add or unhide a tournament in Supabase.
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 xl:grid-cols-3">
                          {featuredTournaments.map((tournament) => (
                            <TournamentCard
                              key={tournament.id}
                              tournament={tournament}
                              isSelected={selectedTournamentId === tournament.id}
                              onClick={() => setSelectedTournamentId(tournament.id)}
                            />
                          ))}
                        </div>

                        <Field label="All Tournaments" hint="dropdown">
                          <SelectInput
                            value={selectedTournamentId}
                            onChange={(event) => setSelectedTournamentId(event.target.value)}
                          >
                            {tournaments.map((tournament) => (
                              <option key={tournament.id} value={tournament.id}>
                                {tournament.name}
                                {formatDate(tournament.start_date || tournament.lock_time)
                                  ? ` — ${formatDate(tournament.start_date || tournament.lock_time)}`
                                  : ""}
                              </option>
                            ))}
                          </SelectInput>
                        </Field>
                      </>
                    )}
                  </div>
                </GlassCard>

                {(errorMessage || successMessage) && (
                  <div
                    className={cn(
                      "rounded-[26px] border p-5",
                      successMessage
                        ? "border-emerald-400/20 bg-emerald-400/10"
                        : "border-red-400/20 bg-red-400/10"
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-bold",
                        successMessage ? "text-emerald-300" : "text-red-300"
                      )}
                    >
                      {successMessage || errorMessage}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-[32px] border border-white/10 bg-white/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">Ready to build the board?</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      Next step: pick golfers and set the player board.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePool}
                    disabled={isSaving || loadingTournaments || loadingPoolrUser}
                    className="rounded-[24px] bg-emerald-500 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Creating..." : "Create Pool"}
                  </button>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-6">
              <GlassCard className="overflow-hidden">
                <div className="border-b border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">
                        Pool Preview
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {poolName.trim() || "Your Pool"}
                      </h2>
                    </div>
                    <Badge tone="success">Live setup</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    This is how the pool manager&apos;s rules will come together before picking golfers.
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  <PreviewRow label="Format" value={displayFormat(draftFormat)} />
                  <PreviewRow
                    label="Tournament"
                    value={selectedTournament?.name || "Select one"}
                  />
                  <PreviewRow label="Course" value={selectedTournamentMeta} />
                  <PreviewRow label="Roster" value={`${rosterSize} golfers`} />
                  <PreviewRow label="Counted" value={`Best ${playersCounted}`} />
                  <PreviewRow
                    label={draftFormat === "tiered_draft" ? "Tier Rule" : "Salary Cap"}
                    value={
                      draftFormat === "tiered_draft"
                        ? tierRule || "1 player from each tier"
                        : formatCap(salaryCap)
                    }
                  />
                  <PreviewRow
                    label="Group Buy-In"
                    value={allowFreePool ? "$0" : formatCurrency(entryFee)}
                  />
                  <PreviewRow
                    label="Experience"
                    value={
                      showLiveLeaderboard
                        ? "Live leaderboard on"
                        : "Live leaderboard off"
                    }
                  />
                  <PreviewRow
                    label="Privacy"
                    value={hideRostersUntilLock ? "Hidden until lock" : "Visible early"}
                  />
                  <PreviewRow
                    label="Bonus"
                    value={`${bonusCount} bonus${bonusCount === 1 ? "" : "es"} on`}
                  />
                </div>

                <div className="border-t border-white/10 p-6">
                  {createdCode ? (
                    <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">
                        Invite Code
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-[0.18em] text-white">
                        {createdCode}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-emerald-300/40 hover:text-emerald-200"
                      >
                        {copied ? "Copied" : "Copy invite"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Next
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        Create the pool, pick golfers, then move to pricing and launch.
                      </p>
                    </div>
                  )}

                  {poolrUser ? (
                    <p className="mt-4 text-xs leading-5 text-neutral-500">
                      Signed in as{" "}
                      <span className="font-bold text-neutral-300">
                        {poolrUser.full_name || poolrUser.email}
                      </span>
                    </p>
                  ) : null}
                </div>
              </GlassCard>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}

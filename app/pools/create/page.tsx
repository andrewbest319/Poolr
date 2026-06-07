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
type SetupPreset = "balanced" | "strategy" | "major";

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
  tone?: "success" | "muted" | "gold" | "dark" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        tone === "success" &&
          "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
        tone === "gold" && "border-amber-300/25 bg-amber-300/10 text-amber-200",
        tone === "blue" && "border-sky-300/25 bg-sky-400/10 text-sky-200",
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
        "rounded-[30px] border border-white/10 bg-white/[0.055] shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl",
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
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
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
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
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
        "w-full rounded-[20px] border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60",
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
        "w-full rounded-[20px] border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15",
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
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-[22px] border p-4 text-left transition",
        checked
          ? "border-emerald-300/25 bg-emerald-400/[0.08]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
      )}
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
        "group relative overflow-hidden rounded-[28px] border p-6 text-left transition",
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
      {badge ? (
        <div className="mt-4">
          <Badge tone="gold">{badge}</Badge>
        </div>
      ) : null}
      <p className="mt-4 text-sm leading-6 text-neutral-400">{description}</p>
    </button>
  );
}

function PresetCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[22px] border p-4 text-left transition",
        selected
          ? "border-emerald-300/35 bg-emerald-400/[0.10]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p>
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
        "relative min-h-[190px] overflow-hidden rounded-[26px] border p-5 text-left transition",
        isSelected
          ? "border-emerald-300/45 bg-emerald-400/[0.12]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.055]"
      )}
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-300/10 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Badge tone={tournament.is_major ? "gold" : "dark"}>
              {getTournamentLabel(tournament)}
            </Badge>
            {isSelected ? <Badge tone="success">Chosen</Badge> : null}
          </div>
          <h3 className="mt-4 text-xl font-black tracking-tight text-white">
            {tournament.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            {formatTournamentMeta(tournament)}
          </p>
        </div>

        {lockDate ? (
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
            Locks {lockDate}
            {lockTime ? ` • ${lockTime}` : ""}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </span>
      <span className="max-w-[58%] text-right text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

function StepRail({
  poolName,
  selectedTournament,
  draftFormat,
}: {
  poolName: string;
  selectedTournament: Tournament | null;
  draftFormat: DraftFormat;
}) {
  const items = [
    { label: "Format", done: true },
    { label: "Scoring", done: true },
    { label: "Basics", done: Boolean(poolName.trim()) },
    { label: "Tournament", done: Boolean(selectedTournament) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "rounded-[20px] border p-4",
            item.done
              ? "border-emerald-300/25 bg-emerald-400/[0.08]"
              : "border-white/10 bg-black/20"
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
            0{index + 1}
          </p>
          <p className="mt-2 text-sm font-black text-white">{item.label}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {item.done ? "Ready" : "Needed"}
          </p>
        </div>
      ))}
      <div className="hidden" aria-hidden="true">
        {displayFormat(draftFormat)}
      </div>
    </div>
  );
}

export default function CreatePoolPage() {
  const router = useRouter();

  const [poolrUserId, setPoolrUserId] = useState("");
  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [loadingPoolrUser, setLoadingPoolrUser] = useState(true);

  const [setupPreset, setSetupPreset] = useState<SetupPreset>("balanced");
  const [poolName, setPoolName] = useState("");
  const [entryFee, setEntryFee] = useState("25");
  const [draftFormat, setDraftFormat] = useState<DraftFormat>("tiered_draft");

  const [rosterSize, setRosterSize] = useState<number>(6);
  const countedOptions = useMemo(() => getCountedOptions(rosterSize), [rosterSize]);
  const [playersCounted, setPlayersCounted] = useState<number>(4);

  const [tierRule, setTierRule] = useState("1 golfer from each tier");
  const [salaryCap, setSalaryCap] = useState("50000");
  const [maxPlayers, setMaxPlayers] = useState("20");

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
    setCreatorDemoUserId(getOrCreateLocalCreatorId());
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
        setErrorMessage("Could not load tournaments. Check the tournaments table in Supabase.");
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
  const experienceCount = [
    showLiveLeaderboard,
    allowTrashTalk,
    hideRostersUntilLock,
  ].filter(Boolean).length;
  const previewJoinLink =
    createdCode && typeof window !== "undefined"
      ? `${window.location.origin}/join-pool?code=${encodeURIComponent(createdCode)}`
      : "";

  function applyPreset(preset: SetupPreset) {
    setSetupPreset(preset);

    if (preset === "balanced") {
      setDraftFormat("tiered_draft");
      setRosterSize(6);
      setPlayersCounted(4);
      setTierRule("1 golfer from each tier");
      setSalaryCap("50000");
      setMaxPlayers("20");
      setBonusLeader(true);
      setBonusTop5(true);
      setBonusTop10(true);
      setShowLiveLeaderboard(true);
      setAllowTrashTalk(true);
      setHideRostersUntilLock(true);
      return;
    }

    if (preset === "strategy") {
      setDraftFormat("salary_cap");
      setRosterSize(8);
      setPlayersCounted(5);
      setSalaryCap("75000");
      setMaxPlayers("24");
      setBonusLeader(true);
      setBonusTop5(true);
      setBonusTop10(false);
      setShowLiveLeaderboard(true);
      setAllowTrashTalk(true);
      setHideRostersUntilLock(true);
      return;
    }

    setDraftFormat("tiered_draft");
    setRosterSize(10);
    setPlayersCounted(6);
    setTierRule("Major setup: 1 golfer from each tier");
    setSalaryCap("100000");
    setMaxPlayers("32");
    setBonusLeader(true);
    setBonusTop5(true);
    setBonusTop10(true);
    setShowLiveLeaderboard(true);
    setAllowTrashTalk(true);
    setHideRostersUntilLock(true);
  }

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

    const parsedEntryFee = Number.parseFloat(entryFee || "0");

    if (!allowFreePool && (!Number.isFinite(parsedEntryFee) || parsedEntryFee < 0)) {
      return "Group buy-in must be $0 or higher.";
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
      setup_preset: setupPreset,
      premium_enabled: true,
      live_leaderboard_enabled: showLiveLeaderboard,
      chat_enabled: allowTrashTalk,
      bonus_points_enabled: bonusLeader || bonusTop5 || bonusTop10,
      bonus_leader_enabled: bonusLeader,
      bonus_top_5_enabled: bonusTop5,
      bonus_top_10_enabled: bonusTop10,
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
        billing_status: "setup_created",
        premium_unlocked_reason: "pool_setup_started",
        created_by_free_experience: false,
        purchase_type: "setup_created",
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
      setSuccessMessage("Pool created. Sending you to build the board...");

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_6%,rgba(16,185,129,0.24),transparent_26%),radial-gradient(circle_at_92%_11%,rgba(59,130,246,0.15),transparent_24%),radial-gradient(circle_at_55%_90%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(to_bottom,#040816,#071221_42%,#040816)]" />
        <div className="absolute left-1/2 top-[-210px] h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[150px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
            <div className="min-w-0 space-y-6">
              <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="relative p-6 sm:p-8">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
                  <div className="relative flex flex-wrap items-center gap-3">
                    <Badge tone="success">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      Create Pool
                    </Badge>
                    <Badge tone="dark">Manager Control Center</Badge>
                    <Badge tone="blue">No clutter</Badge>
                  </div>

                  <div className="relative mt-6 grid gap-6 xl:grid-cols-[1fr_300px] xl:items-end">
                    <div>
                      <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Build a golf pool that feels premium before the first tee shot.
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
                        Choose the draft format, lock in the scoring, pick the tournament,
                        and create a clean invite-ready pool in one smooth setup.
                      </p>
                    </div>

                    <div className="rounded-[28px] border border-emerald-300/20 bg-emerald-400/[0.08] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                        Flow
                      </p>
                      <div className="mt-4 space-y-3 text-sm font-bold text-white">
                        <p>1. Create the pool</p>
                        <p>2. Build the golfer board</p>
                        <p>3. Invite the group</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-black/15 p-4 sm:p-5">
                  <StepRail
                    poolName={poolName}
                    selectedTournament={selectedTournament}
                    draftFormat={draftFormat}
                  />
                </div>
              </div>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  eyebrow="Fast start"
                  title="Start with the right setup"
                  subtitle="Pick a polished default, then tweak anything. This makes the page feel fast instead of overwhelming."
                  right={<Badge tone="gold">Recommended</Badge>}
                />

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <PresetCard
                    title="Classic Poolr"
                    description="6 golfers, best 4 count, tiered draft, full live experience."
                    selected={setupPreset === "balanced"}
                    onClick={() => applyPreset("balanced")}
                  />
                  <PresetCard
                    title="Strategy Night"
                    description="Salary cap, bigger roster, sharper decisions for advanced groups."
                    selected={setupPreset === "strategy"}
                    onClick={() => applyPreset("strategy")}
                  />
                  <PresetCard
                    title="Major Weekend"
                    description="Bigger field, bigger roster, every bonus turned on."
                    selected={setupPreset === "major"}
                    onClick={() => applyPreset("major")}
                  />
                </div>
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  eyebrow="Step 1"
                  title="Draft Format"
                  subtitle="This is the backbone of the pool. Tiered Draft is the clean default; Salary Cap is the advanced strategy mode."
                  right={<Badge tone="gold">Core decision</Badge>}
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <FormatCard
                    title="Tiered Draft"
                    badge="Best default"
                    description="Golfers are grouped into tiers and each participant picks across the board. It feels fair, simple, and perfect for most friend groups."
                    selected={draftFormat === "tiered_draft"}
                    onClick={() => setDraftFormat("tiered_draft")}
                  />

                  <FormatCard
                    title="Salary Cap"
                    badge="Advanced"
                    description="Each participant gets a fake budget and builds a roster by spending on golfers. Better for groups that want more strategy."
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

                  <Field label="Players Counted" hint="best finishers">
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
                    <Field label="Tier Rule" hint="editable">
                      <TextInput
                        value={tierRule}
                        onChange={(event) => setTierRule(event.target.value)}
                      />
                    </Field>
                  ) : (
                    <Field label="Salary Cap" hint="fake budget">
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
                  subtitle="Make the pool feel alive all tournament. These are the features that separate Poolr from a spreadsheet."
                />

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">Bonus scoring</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">
                          Reward golfers who are making noise each round.
                        </p>
                      </div>
                      <Badge tone="dark">{bonusCount}/3 on</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      <Toggle
                        label="Round leader bonus"
                        description="Extra juice when a golfer leads after a round."
                        checked={bonusLeader}
                        onChange={() => setBonusLeader((previous) => !previous)}
                      />
                      <Toggle
                        label="Top 5 bonus"
                        description="Reward golfers pushing near the top of the board."
                        checked={bonusTop5}
                        onChange={() => setBonusTop5((previous) => !previous)}
                      />
                      <Toggle
                        label="Top 10 bonus"
                        description="Keep more teams alive across the weekend."
                        checked={bonusTop10}
                        onChange={() => setBonusTop10((previous) => !previous)}
                      />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">Pool energy</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">
                          Keep teams private before lock and exciting after the first tee shot.
                        </p>
                      </div>
                      <Badge tone="dark">{experienceCount}/3 on</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      <Toggle
                        label="Live leaderboard"
                        description="Give the group a premium live standings view."
                        checked={showLiveLeaderboard}
                        onChange={() => setShowLiveLeaderboard((previous) => !previous)}
                      />
                      <Toggle
                        label="Pool chat / trash talk"
                        description="Let the group react while the tournament unfolds."
                        checked={allowTrashTalk}
                        onChange={() => setAllowTrashTalk((previous) => !previous)}
                      />
                      <Toggle
                        label="Hide rosters until lock"
                        description="No one sees anyone else’s team before the tournament starts."
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
                  subtitle="Name the pool, set the group size, and optionally show a group buy-in for your manager tracking."
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

                  <Field label="Group Buy-In" hint="manager display">
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
                      description="Set the group buy-in display to $0. Great for casual pools, office pools, and first runs."
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
                  subtitle="The clean version: show the top upcoming events, then let the manager use the dropdown for everything else."
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

              <div className="hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-black text-white">Ready to build the golfer board?</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Create the pool now, then choose the golfers for this tournament.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreatePool}
                  disabled={isSaving || loadingTournaments || loadingPoolrUser}
                  className="rounded-[22px] bg-emerald-500 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Creating..." : "Create Pool"}
                </button>
              </div>
            </div>

            <aside className="lg:sticky lg:top-6">
              <GlassCard className="overflow-hidden">
                <div className="border-b border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                        Pool Preview
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {poolName.trim() || "Your Pool"}
                      </h2>
                    </div>
                    <Badge tone="success">Live setup</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    This is the manager’s rule card before the pool moves to the golfer board.
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  <PreviewRow label="Format" value={displayFormat(draftFormat)} />
                  <PreviewRow
                    label="Tournament"
                    value={selectedTournament?.name || "Select one"}
                  />
                  <PreviewRow label="Details" value={selectedTournamentMeta} />
                  <PreviewRow label="Roster" value={`${rosterSize} golfers`} />
                  <PreviewRow label="Counted" value={`Best ${playersCounted}`} />
                  <PreviewRow
                    label={draftFormat === "tiered_draft" ? "Tier Rule" : "Salary Cap"}
                    value={
                      draftFormat === "tiered_draft"
                        ? tierRule || "1 golfer from each tier"
                        : formatCap(salaryCap)
                    }
                  />
                  <PreviewRow label="Max Entries" value={`${maxPlayers} entries`} />
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
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
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
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Next
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        Create the pool, build the golfer board, then invite the group.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCreatePool}
                    disabled={isSaving || loadingTournaments || loadingPoolrUser}
                    className="mt-4 hidden w-full rounded-[22px] bg-emerald-500 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 lg:block"
                  >
                    {isSaving ? "Creating..." : "Create Pool"}
                  </button>

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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#040816]/92 p-3 backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={handleCreatePool}
          disabled={isSaving || loadingTournaments || loadingPoolrUser}
          className="w-full rounded-[20px] bg-emerald-500 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Creating..." : "Create Pool"}
        </button>
      </div>
    </main>
  );
}

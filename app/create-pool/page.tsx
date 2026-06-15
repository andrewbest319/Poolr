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
  has_used_free_pool_experience?: boolean | null;
  first_pool_id?: string | null;
  first_entry_id?: string | null;
  last_pool_created_at?: string | null;
  last_pool_joined_at?: string | null;
  subscription_status?: string | null;
  pro_status?: string | null;
  plan?: string | null;
  poolr_plan?: string | null;
  stripe_subscription_status?: string | null;
  pro_active_until?: string | null;
  is_pro?: boolean | null;
  pro_active?: boolean | null;
  unlimited_pools?: boolean | null;
  single_pool_credits?: number | string | null;
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

function formatTournamentMeta(tournament: Tournament | null) {
  if (!tournament) return "Select a tournament";

  const pieces: string[] = [];

  if (tournament.course) pieces.push(tournament.course);
  if (tournament.location) pieces.push(tournament.location);

  const start = formatDate(tournament.start_date || tournament.lock_time);
  const end = formatDate(tournament.end_date);

  if (start && end && start !== end) {
    pieces.push(`${start} – ${end}`);
  } else if (start) {
    pieces.push(start);
  }

  return pieces.join(" • ") || "Tournament details loading";
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

function formatCap(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return "$50K";
  return `$${Math.round(parsed / 1000)}K`;
}

function displayFormat(format: DraftFormat) {
  return format === "tiered_draft" ? "Tiered Draft" : "Salary Cap";
}

function hasActiveProAccess(user: PoolrUser | null) {
  if (!user) return false;

  const rawUser = user as unknown as Record<string, unknown>;

  const statusValues = [
    rawUser.subscription_status,
    rawUser.pro_status,
    rawUser.billing_status,
    rawUser.stripe_subscription_status,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .filter(Boolean);

  const planValues = [
    rawUser.poolr_plan,
    rawUser.plan,
    rawUser.plan_type,
    rawUser.subscription_plan,
    rawUser.purchase_type,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .filter(Boolean);

  const booleanAccess =
    rawUser.is_pro === true ||
    rawUser.pro_active === true ||
    rawUser.unlimited_pools === true ||
    rawUser.monthly_pro === true ||
    rawUser.annual_pro === true;

  const activeStatus = statusValues.some((value) =>
    ["active", "trialing", "pro"].includes(value)
  );

  const proPlan = planValues.some(
    (value) =>
      value.includes("monthly_pro") ||
      value.includes("annual_pro") ||
      value === "monthly" ||
      value === "annual" ||
      (value.includes("pro") && !value.includes("single"))
  );

  const proActiveUntil = rawUser.pro_active_until
    ? new Date(String(rawUser.pro_active_until)).getTime()
    : 0;

  const futureProAccess =
    Number.isFinite(proActiveUntil) && proActiveUntil > Date.now();

  return booleanAccess || proPlan || activeStatus || futureProAccess;
}
function availableSinglePoolCredits(user: PoolrUser | null) {
  if (!user) return 0;

  const rawUser = user as unknown as Record<string, unknown>;
  const value =
    user.single_pool_credits ??
    (rawUser.pool_credits as number | string | null | undefined) ??
    (rawUser.single_pool_purchases_remaining as number | string | null | undefined);

  const credits = Number(value ?? 0);

  return Number.isFinite(credits) ? credits : 0;
}

function hasUsedFreeExperience(user: PoolrUser | null) {
  return user?.has_used_free_pool_experience === true;
}

function Badge({ children, tone = "dark" }: { children: ReactNode; tone?: "green" | "gold" | "blue" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        tone === "green" && "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
        tone === "gold" && "border-amber-300/25 bg-amber-300/10 text-amber-200",
        tone === "blue" && "border-sky-300/25 bg-sky-300/10 text-sky-200",
        tone === "dark" && "border-white/10 bg-white/[0.05] text-neutral-300"
      )}
    >
      {children}
    </span>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[30px] border border-white/10 bg-white/[0.055] shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </section>
  );
}

function SectionTitle({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-xs font-black text-emerald-200">
          {step}
        </span>
        <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">{subtitle}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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
      <div className="mt-2.5">{children}</div>
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[18px] border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-60",
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
        "w-full rounded-[18px] border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15",
        props.className
      )}
    />
  );
}

function FormatButton({
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
        "relative rounded-[24px] border p-5 text-left transition",
        selected
          ? "border-emerald-300/45 bg-emerald-300/[0.12] shadow-[0_0_0_1px_rgba(52,211,153,0.16)]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.045]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        <span
          className={cn(
            "mt-1 h-5 w-5 rounded-full border transition",
            selected ? "border-emerald-200 bg-emerald-300" : "border-white/20 bg-white/5"
          )}
        />
      </div>
    </button>
  );
}

function TournamentButton({
  tournament,
  selected,
  onClick,
}: {
  tournament: Tournament;
  selected: boolean;
  onClick: () => void;
}) {
  const lockDate = formatDate(tournament.lock_time || tournament.start_date);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[22px] border p-4 text-left transition",
        selected
          ? "border-emerald-300/45 bg-emerald-300/[0.12]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.045]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone={tournament.is_major ? "gold" : "dark"}>{getTournamentLabel(tournament)}</Badge>
        {selected ? <span className="text-xs font-black text-emerald-200">Selected</span> : null}
      </div>
      <h3 className="mt-4 text-base font-black text-white">{tournament.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-400">
        {formatTournamentMeta(tournament)}
      </p>
      {lockDate ? (
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
          Locks {lockDate}
        </p>
      ) : null}
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </span>
      <span className="max-w-[62%] text-right text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function DotStep({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          active || done ? "bg-emerald-300" : "bg-white/20"
        )}
      />
      <span className={cn("text-xs font-black uppercase tracking-[0.16em]", active || done ? "text-white" : "text-neutral-500")}>
        {label}
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
  const [draftFormat, setDraftFormat] = useState<DraftFormat>("tiered_draft");
  const [rosterSize, setRosterSize] = useState<number>(6);
  const countedOptions = useMemo(() => getCountedOptions(rosterSize), [rosterSize]);
  const [playersCounted, setPlayersCounted] = useState<number>(4);
  const [tierRule, setTierRule] = useState("1 golfer from each tier");
  const [salaryCap, setSalaryCap] = useState("50000");
  const [entryFee, setEntryFee] = useState("0");
  const [allowFreePool, setAllowFreePool] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState("20");

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
  const userHasProAccess = hasActiveProAccess(poolrUser);
  const userHasSinglePoolCredit = availableSinglePoolCredits(poolrUser) > 0;
  const userHasUsedFreeExperience = hasUsedFreeExperience(poolrUser);
  const usingFreeFirstPool =
    Boolean(poolrUser) && !userHasUsedFreeExperience && !userHasProAccess;
  const mustPayBeforeCreate =
    Boolean(poolrUser) &&
    userHasUsedFreeExperience &&
    !userHasProAccess &&
    !userHasSinglePoolCredit;
  const pricingHref = `/pricing?returnTo=${encodeURIComponent(CREATE_POOL_PATH)}`;
  const createButtonLabel = mustPayBeforeCreate
    ? "Choose Paid Plan"
    : isSaving
      ? "Creating..."
      : usingFreeFirstPool
        ? "Create Free First Pool"
        : userHasProAccess
          ? "Create With Pro"
          : userHasSinglePoolCredit
            ? "Create With Single Pool Credit"
            : "Create Pool";
  const previewJoinLink =
    createdCode && typeof window !== "undefined"
      ? `${window.location.origin}/join-pool?code=${encodeURIComponent(createdCode)}`
      : "";

  const rulesReady = Boolean(poolName.trim()) && Boolean(selectedTournamentId);

  function quickDefault(format: DraftFormat) {
    setDraftFormat(format);

    if (format === "tiered_draft") {
      setRosterSize(6);
      setPlayersCounted(4);
      setTierRule("1 golfer from each tier");
      setSalaryCap("50000");
      return;
    }

    setRosterSize(6);
    setPlayersCounted(4);
    setSalaryCap("50000");
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
    if (mustPayBeforeCreate) {
      return "You already used your free Poolr experience. Choose Single Pool or Pro before creating another pool.";
    }
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
      setup_preset: "clean_default",
      premium_enabled: true,
      live_leaderboard_enabled: true,
      chat_enabled: true,
      bonus_points_enabled: true,
      bonus_leader_enabled: true,
      bonus_top_5_enabled: true,
      bonus_top_10_enabled: true,
      hidden_teams_before_lock: true,
      payment_mode: allowFreePool ? "free" : "pay-later",
    };

    const { error } = await supabase
      .from("pools")
      .update(optionalPayload)
      .eq("id", poolId);

    if (error) {
      console.warn("Optional feature settings were not saved:", error.message);
    }
  }

  async function finalizeCreatorEntitlementAfterPoolCreate(poolId: string) {
    if (!poolrUserId || !poolrUser) return;

    const updatePayload: Record<string, unknown> = {
      last_pool_created_at: new Date().toISOString(),
    };

    if (usingFreeFirstPool) {
      updatePayload.has_used_free_pool_experience = true;

      if (!poolrUser.first_pool_id) {
        updatePayload.first_pool_id = poolId;
      }
    }

    if (!usingFreeFirstPool && !userHasProAccess && userHasSinglePoolCredit) {
      const remainingCredits = Math.max(availableSinglePoolCredits(poolrUser) - 1, 0);
      updatePayload.single_pool_credits = remainingCredits;
      updatePayload.poolr_plan = remainingCredits > 0 ? "single_pool_credit" : "free";
    }

    const { data, error } = await supabase
      .from("poolr_users")
      .update(updatePayload)
      .eq("id", poolrUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(
        `Pool was created, but Poolr could not update your account entitlement: ${error.message}`
      );
    }

    if (data) {
      setPoolrUser(data as PoolrUser);
    }
  }

  async function handleCreatePool() {
    if (mustPayBeforeCreate) {
      router.push(pricingHref);
      return;
    }

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
      const purchaseType = usingFreeFirstPool
        ? "free_first_pool"
        : userHasProAccess
          ? "pro_included"
          : userHasSinglePoolCredit
            ? "single_pool_credit"
            : "paid_required";
      const paymentStatus =
        usingFreeFirstPool || userHasProAccess || userHasSinglePoolCredit
          ? "unlocked"
          : "payment_required";

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
        payment_status: paymentStatus,
        billing_status: paymentStatus,
        premium_unlocked_reason: usingFreeFirstPool
          ? "free_first_pool"
          : userHasProAccess
            ? "pro_plan"
            : userHasSinglePoolCredit
              ? "single_pool_credit"
              : "payment_required",
        created_by_free_experience: usingFreeFirstPool,
        purchase_type: purchaseType,
      };

      const createdPool = await insertPoolWithFallback(payload);
      await saveOptionalFeatureSettings(createdPool.id);
      await finalizeCreatorEntitlementAfterPoolCreate(createdPool.id);

      const finalInviteCode = createdPool.invite_code || inviteCode;
      const inviteLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/join-pool?code=${encodeURIComponent(finalInviteCode)}`
          : `/join-pool?code=${encodeURIComponent(finalInviteCode)}`;

      setCreatedCode(finalInviteCode);
      setCreatedInviteLink(inviteLink);
      setSuccessMessage("Pool created. Opening the golfer board...");

      window.setTimeout(() => {
        router.push(`/pool/${createdPool.id}/build-team`);
      }, 600);
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
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.20),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(59,130,246,0.14),transparent_26%),linear-gradient(to_bottom,#030712,#06121f_46%,#030712)]" />
        <div className="absolute left-1/2 top-[-240px] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[160px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
          <header className="mb-6 rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="green">Create Pool</Badge>
                  <Badge tone="dark">Tournament Setup</Badge>
                  {usingFreeFirstPool ? <Badge tone="blue">Free First Pool</Badge> : null}
                  {userHasProAccess ? <Badge tone="gold">Pro Access</Badge> : null}
                  {!userHasProAccess && userHasSinglePoolCredit ? <Badge tone="blue">Single Pool Credit</Badge> : null}
                  {mustPayBeforeCreate ? <Badge tone="gold">Paid Pool Required</Badge> : null}
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Create your pool.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
                  Pick the tournament, set the rules, and move straight into building the golfer board.
                </p>
              </div>

              <div className="grid gap-3 rounded-[26px] border border-white/10 bg-black/20 p-4 sm:grid-cols-3 lg:min-w-[430px]">
                <DotStep label="Tournament" active={!selectedTournament} done={Boolean(selectedTournament)} />
                <DotStep label="Rules" active={Boolean(selectedTournament) && !poolName.trim()} done={Boolean(poolName.trim())} />
                <DotStep label="Build Team" active={rulesReady} />
              </div>
            </div>
          </header>

          {mustPayBeforeCreate ? (
            <div className="mb-6 rounded-[30px] border border-amber-300/25 bg-amber-300/[0.08] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">
                    Free pool already used
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Choose Single Pool or Pro to create another pool.
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
                    Every Poolr account gets one free premium pool lifetime. Your first pool has already been used, so the next pool must be unlocked with Single Pool, Monthly Pro, or Annual Pro.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(pricingHref)}
                  className="rounded-[20px] bg-amber-300 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-amber-200"
                >
                  View Plans
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="space-y-6">
              <Card className="p-5 sm:p-7">
                <SectionTitle
                  step="1"
                  title="Tournament"
                  subtitle="Choose the event your group is playing. The golfer board will use this tournament after the pool is created."
                />

                <div className="mt-6 space-y-5">
                  {loadingTournaments ? (
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-neutral-400">
                      Loading tournaments...
                    </div>
                  ) : tournaments.length === 0 ? (
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-neutral-400">
                      No tournaments are visible yet. Add or unhide a tournament in Supabase.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        {featuredTournaments.map((tournament) => (
                          <TournamentButton
                            key={tournament.id}
                            tournament={tournament}
                            selected={selectedTournamentId === tournament.id}
                            onClick={() => setSelectedTournamentId(tournament.id)}
                          />
                        ))}
                      </div>

                      <Field label="All tournaments" hint={`${tournaments.length} available`}>
                        <SelectInput
                          value={selectedTournamentId}
                          onChange={(event) => setSelectedTournamentId(event.target.value)}
                        >
                          {tournaments.map((tournament) => {
                            const eventDate = formatDate(tournament.start_date || tournament.lock_time);

                            return (
                              <option key={tournament.id} value={tournament.id}>
                                {tournament.name}
                                {eventDate ? ` — ${eventDate}` : ""}
                              </option>
                            );
                          })}
                        </SelectInput>
                      </Field>
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-5 sm:p-7">
                <SectionTitle
                  step="2"
                  title="Format"
                  subtitle="Keep it simple with tiers or make it more strategic with a salary cap."
                />

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <FormatButton
                    title="Tiered Draft"
                    description="Golfers are grouped by tier. Each entry picks across the board."
                    selected={draftFormat === "tiered_draft"}
                    onClick={() => quickDefault("tiered_draft")}
                  />
                  <FormatButton
                    title="Salary Cap"
                    description="Each entry builds a roster using a fake team budget."
                    selected={draftFormat === "salary_cap"}
                    onClick={() => quickDefault("salary_cap")}
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <Field label="Roster size">
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

                  <Field label="Players counted" hint="best scores">
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

                  {draftFormat === "salary_cap" ? (
                    <Field label="Salary cap" hint="fake budget">
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
                  ) : (
                    <Field label="Tier rule" hint="editable">
                      <TextInput
                        value={tierRule}
                        onChange={(event) => setTierRule(event.target.value)}
                      />
                    </Field>
                  )}
                </div>
              </Card>

              <Card className="p-5 sm:p-7">
                <SectionTitle
                  step="3"
                  title="Pool details"
                  subtitle="Name the pool and set the entry settings your group will see."
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Pool name">
                    <TextInput
                      value={poolName}
                      onChange={(event) => setPoolName(event.target.value)}
                      placeholder="Sunday Major Pool"
                    />
                  </Field>

                  <Field label="Max entries">
                    <SelectInput
                      value={maxPlayers}
                      onChange={(event) => setMaxPlayers(event.target.value)}
                    >
                      {MAX_PLAYER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          Up to {option}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>

                <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                      <Field label="Group buy-in" hint="optional tracking">
                        <TextInput
                          type="number"
                          min="0"
                          step="1"
                          value={allowFreePool ? "0" : entryFee}
                          onChange={(event) => {
                            setEntryFee(event.target.value);
                            setAllowFreePool(Number.parseFloat(event.target.value || "0") <= 0);
                          }}
                          disabled={allowFreePool}
                          placeholder="0"
                        />
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAllowFreePool((current) => {
                          const next = !current;
                          if (next) setEntryFee("0");
                          if (!next && Number.parseFloat(entryFee || "0") <= 0) setEntryFee("25");
                          return next;
                        });
                      }}
                      className={cn(
                        "rounded-[18px] border px-5 py-3.5 text-sm font-black transition",
                        allowFreePool
                          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.04] text-white hover:border-white/20"
                      )}
                    >
                      {allowFreePool ? "Free pool" : "Buy-in on"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
                  <p className="text-sm font-bold text-emerald-100">
                    Live leaderboard, hidden rosters before lock, chat, and bonus scoring are turned on by default.
                  </p>
                </div>
              </Card>

              {(errorMessage || successMessage) && (
                <div
                  className={cn(
                    "rounded-[24px] border p-5",
                    successMessage
                      ? "border-emerald-300/20 bg-emerald-300/10"
                      : "border-red-400/20 bg-red-400/10"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-bold",
                      successMessage ? "text-emerald-200" : "text-red-200"
                    )}
                  >
                    {successMessage || errorMessage}
                  </p>
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-6">
              <Card className="overflow-hidden">
                <div className="border-b border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                        Preview
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {poolName.trim() || "Your Pool"}
                      </h2>
                    </div>
                    <Badge tone={rulesReady ? "green" : "dark"}>{rulesReady ? "Ready" : "Draft"}</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    Review the setup, then create the pool and build the board.
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  <PreviewRow label="Tournament" value={selectedTournament?.name || "Select one"} />
                  <PreviewRow label="Details" value={selectedTournamentMeta} />
                  <PreviewRow label="Format" value={displayFormat(draftFormat)} />
                  <PreviewRow label="Roster" value={`${rosterSize} golfers`} />
                  <PreviewRow label="Counted" value={`Best ${playersCounted}`} />
                  <PreviewRow
                    label={draftFormat === "salary_cap" ? "Cap" : "Rule"}
                    value={
                      draftFormat === "salary_cap"
                        ? formatCap(salaryCap)
                        : tierRule || "1 golfer from each tier"
                    }
                  />
                  <PreviewRow label="Entries" value={`Up to ${maxPlayers}`} />
                  <PreviewRow label="Buy-in" value={allowFreePool ? "$0" : formatCurrency(entryFee)} />
                  <PreviewRow
                    label="Poolr access"
                    value={
                      usingFreeFirstPool
                        ? "Free first pool"
                        : userHasProAccess
                          ? "Included with Pro"
                          : userHasSinglePoolCredit
                            ? "Single pool credit"
                            : "Paid plan required"
                    }
                  />
                </div>

                <div className="border-t border-white/10 p-6">
                  {createdCode ? (
                    <div className="mb-4 rounded-[22px] border border-emerald-300/20 bg-emerald-300/10 p-4">
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
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCreatePool}
                    disabled={isSaving || loadingTournaments || loadingPoolrUser}
                    className="w-full rounded-[22px] bg-emerald-400 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {createButtonLabel}
                  </button>

                  {poolrUser ? (
                    <p className="mt-4 text-xs leading-5 text-neutral-500">
                      Signed in as{" "}
                      <span className="font-bold text-neutral-300">
                        {poolrUser.full_name || poolrUser.email}
                      </span>
                      {userHasUsedFreeExperience ? " • Free used" : " • First pool free"}
                    </p>
                  ) : null}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#030712]/92 p-3 backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={handleCreatePool}
          disabled={isSaving || loadingTournaments || loadingPoolrUser}
          className="w-full rounded-[20px] bg-emerald-400 px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createButtonLabel}
        </button>
      </div>
    </main>
  );
}

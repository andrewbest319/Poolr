"use client";

import Link from "next/link";
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
type DraftFormat = "salary_cap" | "tiered_draft";
type PurchaseType = "free_first_pool" | "single_pool" | "monthly" | "annual";

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

type CreatorProfile = {
  id: string;
  demo_user_id: string;
  email: string | null;
  free_pool_used: boolean | null;
  plan: string | null;
  subscription_status: string | null;
};

type PoolrUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  has_used_free_pool_experience: boolean;
  first_pool_id: string | null;
  first_entry_id: string | null;
  last_pool_created_at?: string | null;
  last_pool_joined_at?: string | null;
};

type CreatedPool = {
  id: string;
  invite_code: string | null;
};

const ROSTER_OPTIONS = [4, 6, 8, 10] as const;
const CREATE_POOL_PATH = "/pools/create";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
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

function formatTournamentMeta(tournament: Tournament) {
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

  return parts.join(" • ");
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
  if (tournament.is_major) return "Major Championship";
  if (tournament.is_signature) return "Signature Event";

  const tier = String(tournament.event_tier ?? "").toLowerCase();

  if (tier === "liv") return "LIV Golf";
  if (tier === "playoff") return "FedExCup Playoffs";
  if (tier === "team-event") return "Team Event";
  if (tier === "fall") return "FedExCup Fall";
  if (tier === "co-sanctioned") return "Co-Sanctioned Event";

  return null;
}

function formatCurrency(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  return `$${Number.isNaN(parsed) ? 0 : parsed.toLocaleString()}`;
}

function displayFormat(format: DraftFormat) {
  return format === "salary_cap" ? "Salary Cap" : "Tiered Draft";
}

function purchaseLabel(type: PurchaseType) {
  if (type === "free_first_pool") return "Free First Pool";
  if (type === "single_pool") return "Single Pool";
  if (type === "monthly") return "Monthly Pro";
  return "Annual Pro";
}

function purchaseAmountCents(type: PurchaseType) {
  if (type === "free_first_pool") return 0;
  if (type === "single_pool") return 999;
  if (type === "monthly") return 999;
  return 5999;
}

function purchasePriceText(type: PurchaseType) {
  if (type === "free_first_pool") return "$0";
  if (type === "single_pool") return "$9.99";
  if (type === "monthly") return "$9.99/mo";
  return "$59.99/yr";
}

function statusTone(status: string | null | undefined) {
  const value = String(status ?? "").toLowerCase();

  if (value === "open" || value === "live" || value === "upcoming") return "success";
  if (value === "hidden" || value === "final") return "muted";
  return "default";
}

function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "muted" | "danger";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em]",
        variant === "success" &&
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
        variant === "default" && "border-white/12 bg-white/5 text-white/80",
        variant === "muted" && "border-white/10 bg-black/20 text-neutral-400",
        variant === "danger" && "border-red-400/20 bg-red-400/10 text-red-200"
      )}
    >
      {children}
    </div>
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
    <div
      className={cn(
        "rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_24px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      {right ? <div>{right}</div> : null}
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
        "w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/45 focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60",
        props.className
      )}
    />
  );
}

function SelectInput({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
}) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition focus:border-emerald-400/45 focus:ring-2 focus:ring-emerald-400/20",
        className
      )}
    >
      {children}
    </select>
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
      className="flex w-full items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>
      </div>

      <span
        className={cn(
          "relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
          checked ? "bg-emerald-400" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}

function FeaturePill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
      {label}
    </div>
  );
}

function StatBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{detail}</p>
    </div>
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
  const lockDate = formatDate(tournament.lock_time);
  const lockTime = formatTime(tournament.lock_time);
  const label = getTournamentLabel(tournament);
  const featured = Boolean(tournament.is_featured || tournament.is_major);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-[26px] border p-5 text-left transition",
        isSelected
          ? "border-emerald-400/35 bg-emerald-400/10 shadow-[0_18px_70px_rgba(16,185,129,0.12)]"
          : featured
            ? "border-emerald-400/15 bg-emerald-400/[0.055] hover:border-emerald-400/30 hover:bg-emerald-400/[0.08]"
            : "border-white/10 bg-black/20 hover:border-white/18 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {label ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                {label}
              </span>
            ) : null}

            {tournament.tour ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-300">
                {tournament.tour}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-tight text-white">
            {tournament.name}
          </h3>

          <p className="mt-3 text-base leading-7 text-neutral-300">
            {formatTournamentMeta(tournament) || "Tournament details available"}
          </p>

          {lockDate ? (
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              Locks {lockDate}
              {lockTime ? ` • ${lockTime}` : ""}
            </p>
          ) : null}
        </div>

        <Badge variant={statusTone(tournament.status) as "default" | "success" | "muted"}>
          {tournament.status || "upcoming"}
        </Badge>
      </div>
    </button>
  );
}

function PreviewRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border p-4",
        highlight
          ? "border-emerald-400/20 bg-emerald-400/10"
          : "border-white/10 bg-black/20"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  description,
  selected,
  disabled,
  badge,
  onClick,
}: {
  title: string;
  price: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative rounded-[26px] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_18px_70px_rgba(16,185,129,0.10)]"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      {badge ? (
        <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
          {badge}
        </div>
      ) : null}

      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-2 text-3xl font-black text-emerald-300">{price}</p>
      <p className="mt-3 text-sm leading-6 text-neutral-400">{description}</p>
    </button>
  );
}

export default function CreatePoolPage() {
  const router = useRouter();

  const [poolrUserId, setPoolrUserId] = useState("");
  const [poolrUser, setPoolrUser] = useState<PoolrUser | null>(null);
  const [loadingPoolrUser, setLoadingPoolrUser] = useState(true);

  const [poolName, setPoolName] = useState("");
  const [entryFee, setEntryFee] = useState("25");
  const [draftFormat, setDraftFormat] = useState<DraftFormat>("salary_cap");

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
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [selectedPurchase, setSelectedPurchase] =
    useState<PurchaseType>("free_first_pool");

  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingCreator, setLoadingCreator] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [createdCode, setCreatedCode] = useState("");
  const [createdPoolId, setCreatedPoolId] = useState("");
  const [createdInviteLink, setCreatedInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const freePoolAvailable = !poolrUser?.has_used_free_pool_experience;
  const hasActivePlan =
    creatorProfile?.subscription_status === "active" &&
    (creatorProfile?.plan === "monthly" || creatorProfile?.plan === "annual");

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

        const user = data as PoolrUser;

        setPoolrUserId(user.id);
        setPoolrUser(user);
      } catch (err) {
        console.error("Failed to load Poolr user:", err);
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
    async function loadCreator() {
      setLoadingCreator(true);

      try {
        const demoId = getOrCreateLocalCreatorId();
        setCreatorDemoUserId(demoId);

        if (!demoId) return;

        const existing = await supabase
          .from("pool_creators")
          .select("*")
          .eq("demo_user_id", demoId)
          .maybeSingle();

        if (existing.error) throw new Error(existing.error.message);

        if (existing.data) {
          const profile = existing.data as CreatorProfile;
          setCreatorProfile(profile);

          if (
            profile.subscription_status === "active" &&
            (profile.plan === "monthly" || profile.plan === "annual")
          ) {
            setSelectedPurchase(profile.plan as PurchaseType);
          } else if (poolrUser?.has_used_free_pool_experience) {
            setSelectedPurchase("single_pool");
          } else {
            setSelectedPurchase("free_first_pool");
          }

          return;
        }

        const created = await supabase
          .from("pool_creators")
          .insert({
            demo_user_id: demoId,
            free_pool_used: false,
            plan: "free",
            subscription_status: "inactive",
          })
          .select("*")
          .single();

        if (created.error) throw new Error(created.error.message);

        setCreatorProfile(created.data as CreatorProfile);
        setSelectedPurchase(poolrUser?.has_used_free_pool_experience ? "single_pool" : "free_first_pool");
      } catch (error) {
        console.error("Failed to load creator profile:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load creator pricing profile."
        );
      } finally {
        setLoadingCreator(false);
      }
    }

    loadCreator();
  }, [poolrUser?.has_used_free_pool_experience]);

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
          visibleRows.find((tournament) => tournament.slug === "us-open-2026") ??
          visibleRows.find((tournament) => tournament.is_featured) ??
          visibleRows.find((tournament) => {
            const status = String(tournament.status ?? "").toLowerCase();
            return status === "open" || status === "live" || status === "upcoming";
          }) ??
          visibleRows[0];

        setSelectedTournamentId((current) => current || preferred.id);
      }

      setLoadingTournaments(false);
    }

    loadTournaments();
  }, []);

  useEffect(() => {
    if (!freePoolAvailable && selectedPurchase === "free_first_pool") {
      setSelectedPurchase("single_pool");
    }
  }, [freePoolAvailable, selectedPurchase]);

  const selectedTournament =
    tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null;

  const selectedTournamentMeta = selectedTournament
    ? formatTournamentMeta(selectedTournament)
    : "";

  const featuredTournaments = useMemo(
    () =>
      tournaments
        .filter((tournament) => tournament.is_featured || tournament.is_major)
        .sort(sortTournaments),
    [tournaments]
  );

  const standardTournaments = useMemo(
    () =>
      tournaments
        .filter((tournament) => !tournament.is_featured && !tournament.is_major)
        .sort(sortTournaments),
    [tournaments]
  );

  const bonusCount = [bonusLeader, bonusTop5, bonusTop10].filter(Boolean).length;

  const entryFeeNumber = allowFreePool ? 0 : Number(entryFee || 0);
  const maxPlayersNumber = Number(maxPlayers || 0);
  const salaryCapNumber = Number(salaryCap || 0);

  const projectedPot = maxPlayersNumber > 0 ? entryFeeNumber * maxPlayersNumber : 0;

  const previewJoinLink =
    typeof window !== "undefined" && createdCode
      ? `${window.location.origin}/join-pool?code=${encodeURIComponent(createdCode)}`
      : "";

  const launchLabel =
    selectedPurchase === "free_first_pool" || hasActivePlan
      ? "Launch Premium Pool"
      : selectedPurchase === "single_pool"
        ? "Stripe Checkout Required — $9.99"
        : selectedPurchase === "monthly"
          ? "Stripe Checkout Required — $9.99/mo"
          : "Stripe Checkout Required — $59.99/yr";

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
    if (!poolrUserId) return "Create your Poolr account before launching a pool.";
    if (!poolName.trim()) return "Enter a pool name.";
    if (!selectedTournamentId) return "Select a tournament.";

    if (!freePoolAvailable && selectedPurchase === "free_first_pool") {
      return "Your free Poolr experience has already been used. Choose Single Pool, Monthly, or Annual.";
    }

    if (!hasActivePlan && selectedPurchase !== "free_first_pool") {
      return "Stripe checkout is the next step. Tomorrow we will connect Single Pool, Monthly, and Annual checkout before paid pools can launch.";
    }

    if (!allowFreePool && Number(entryFee) < 0) {
      return "Entry fee cannot be negative.";
    }

    if (Number(maxPlayers) < 2) {
      return "Max players must be at least 2.";
    }

    if (draftFormat === "salary_cap" && Number(salaryCap) <= 0) {
      return "Set a valid salary cap.";
    }

    if (playersCounted < getMinCount(rosterSize) || playersCounted > rosterSize) {
      return "Players counted must be at least half the roster and no more than the roster size.";
    }

    return "";
  }

  async function insertPoolWithFallback(payload: Record<string, unknown>) {
    const attempts: Record<string, unknown>[] = [
      payload,
      {
        name: payload.name,
        format: payload.format,
        entry_fee: payload.entry_fee,
        roster_size: payload.roster_size,
        counted_players: payload.counted_players,
        salary_cap: payload.salary_cap,
        max_players: payload.max_players,
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
      console.warn("Optional feature settings were not saved:", error.message);
    }
  }

  async function recordPurchase(poolId: string, purchaseType: PurchaseType) {
    const amountCents = purchaseAmountCents(purchaseType);

    const { error } = await supabase.from("pool_purchases").insert({
      pool_id: poolId,
      creator_demo_user_id: creatorDemoUserId,
      poolr_user_id: poolrUserId || null,
      purchase_type: purchaseType,
      amount_cents: amountCents,
      status: "completed",
    });

    if (error) {
      console.warn("Purchase record was not saved:", error.message);
    }
  }

  async function updateCreatorAfterLaunch(
    purchaseType: PurchaseType,
    poolId: string
  ) {
    if (poolrUserId) {
      const userUpdate: Record<string, unknown> = {
        has_used_free_pool_experience: true,
        last_pool_created_at: new Date().toISOString(),
      };

      if (!poolrUser?.first_pool_id) {
        userUpdate.first_pool_id = poolId;
      }

      const { data: updatedUser, error: userError } = await supabase
        .from("poolr_users")
        .update(userUpdate)
        .eq("id", poolrUserId)
        .select("*")
        .maybeSingle();

      if (userError) {
        console.warn("Poolr user free experience was not updated:", userError.message);
      }

      if (updatedUser) {
        setPoolrUser(updatedUser as PoolrUser);
      }
    }

    if (!creatorDemoUserId) return;

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      free_pool_used: true,
    };

    if (purchaseType === "monthly") {
      update.plan = "monthly";
      update.subscription_status = "active";
    }

    if (purchaseType === "annual") {
      update.plan = "annual";
      update.subscription_status = "active";
    }

    const { data, error } = await supabase
      .from("pool_creators")
      .update(update)
      .eq("demo_user_id", creatorDemoUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.warn("Creator profile was not updated:", error.message);
      return;
    }

    if (data) {
      setCreatorProfile(data as CreatorProfile);
    }
  }

  async function handleCreatePool() {
    const validationError = validateForm();

    setErrorMessage("");
    setSuccessMessage("");
    setCopied(false);
    setCreatedCode("");
    setCreatedPoolId("");
    setCreatedInviteLink("");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const inviteCode = await createUniqueInviteCode();
      const purchaseType = hasActivePlan
        ? ((creatorProfile?.plan as PurchaseType) || selectedPurchase)
        : selectedPurchase;

      const payload: Record<string, unknown> = {
        name: poolName.trim(),
        format: displayFormat(draftFormat),
        entry_fee: entryFeeNumber,
        roster_size: rosterSize,
        counted_players: playersCounted,
        salary_cap: draftFormat === "salary_cap" ? salaryCapNumber : null,
        max_players: maxPlayersNumber || null,
        invite_code: inviteCode,
        premium: true,
        status: "open",
        tournament_id: selectedTournamentId,
        creator_poolr_user_id: poolrUserId || null,
        creator_demo_user_id: creatorDemoUserId || null,
        payment_status:
          purchaseType === "free_first_pool" ? "free_first_pool" : "paid",
        billing_status:
          purchaseType === "free_first_pool" ? "free_first_pool" : "subscription_unlocked",
        premium_unlocked_reason:
          purchaseType === "free_first_pool"
            ? "first_poolr_experience"
            : "active_subscription",
        created_by_free_experience: purchaseType === "free_first_pool",
        purchase_type: purchaseType,
      };

      const createdPool = await insertPoolWithFallback(payload);

      await saveOptionalFeatureSettings(createdPool.id);
      await recordPurchase(createdPool.id, purchaseType);
      await updateCreatorAfterLaunch(purchaseType, createdPool.id);

      const finalInviteCode = createdPool.invite_code || inviteCode;
      const inviteLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/join-pool?code=${encodeURIComponent(
              finalInviteCode
            )}`
          : `/join-pool?code=${encodeURIComponent(finalInviteCode)}`;

      setCreatedPoolId(createdPool.id);
      setCreatedCode(finalInviteCode);
      setCreatedInviteLink(inviteLink);
      setSuccessMessage("Your premium pool is live. Redirecting to the lobby...");

      window.setTimeout(() => {
        router.push(`/pool/${createdPool.id}`);
      }, 650);
    } catch (error) {
      console.error("Failed to create pool:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your premium pool."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.18),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.17),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(to_bottom,#040816,#061121,#040816)]" />
        <div className="absolute left-1/2 top-0 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-20">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <section>
              <Badge variant="success">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Premium Pool Creation
              </Badge>

              <h1 className="mt-6 max-w-5xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-7xl">
                Launch the cleanest golf pool your group has ever played.
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">
                Choose the tournament, lock the format, set the rules, and create a
                premium invite flow that gets your group into the action fast.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <FeaturePill label="LIVE LEADERBOARD" />
                <FeaturePill label="PRIVATE PICKS BEFORE LOCK" />
                <FeaturePill label="INVITE CODE SYSTEM" />
                <FeaturePill label="PREMIUM EXPERIENCE" />
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <StatBox
                  label="Pool Type"
                  value="Premium"
                  detail="Creator pays, everyone else joins free."
                />
                <StatBox
                  label="Current Format"
                  value={displayFormat(draftFormat)}
                  detail="Simple rules make the pool feel serious."
                />
                <StatBox
                  label="Projected Pot"
                  value={formatCurrency(projectedPot)}
                  detail={`${maxPlayersNumber || 0} players at ${formatCurrency(entryFeeNumber)}`}
                />
              </div>
            </section>

            <GlassCard className="p-7 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                Poolr Access
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Create a premium golf pool in seconds.
              </h2>

              <p className="mt-5 text-base leading-8 text-neutral-300">
                Poolr handles the setup: tournament connection, custom rules, invite code,
                and live lobby — so your group can join fast and play with a premium experience.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <StatBox
                  label="Tournament"
                  value={selectedTournament?.name || "Select one"}
                  detail={selectedTournamentMeta || "Pick the live event"}
                />
                <StatBox
                  label="Selected Plan"
                  value={purchasePriceText(selectedPurchase)}
                  detail={purchaseLabel(selectedPurchase)}
                />
              </div>

              {poolrUser && (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    Signed In
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {poolrUser.full_name}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">{poolrUser.email}</p>
                </div>
              )}
            </GlassCard>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="Product Access"
                  subtitle="One creator unlocks the pool. Everyone else joins free."
                  right={
                    <Badge variant={freePoolAvailable ? "success" : "muted"}>
                      {loadingPoolrUser || loadingCreator
                        ? "Loading"
                        : hasActivePlan
                          ? `${creatorProfile?.plan} active`
                          : freePoolAvailable
                            ? "Free pool available"
                            : "Free experience used"}
                    </Badge>
                  }
                />

                <div className="mt-6 rounded-[24px] border border-amber-300/15 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/90">
                  Paid checkout is intentionally blocked until Stripe is connected tomorrow. Free first pools can launch now; Single Pool, Monthly, and Annual will route through Stripe once live.
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <PricingCard
                    title="Free First Pool"
                    price="$0"
                    description="Your first Poolr experience lets you try the premium product with your group."
                    selected={selectedPurchase === "free_first_pool"}
                    disabled={!freePoolAvailable || hasActivePlan}
                    badge={freePoolAvailable ? "Available" : "Used"}
                    onClick={() => setSelectedPurchase("free_first_pool")}
                  />

                  <PricingCard
                    title="Single Pool"
                    price="$9.99"
                    description="Run one premium pool for one tournament."
                    selected={selectedPurchase === "single_pool"}
                    disabled={hasActivePlan}
                    badge="Default"
                    onClick={() => setSelectedPurchase("single_pool")}
                  />

                  <PricingCard
                    title="Monthly Pro"
                    price="$9.99/mo"
                    description="Run unlimited pools while your monthly plan is active."
                    selected={selectedPurchase === "monthly"}
                    badge="Unlimited"
                    onClick={() => setSelectedPurchase("monthly")}
                  />

                  <PricingCard
                    title="Annual Pro"
                    price="$59.99/yr"
                    description="Best value for serious groups that play all season."
                    selected={selectedPurchase === "annual"}
                    badge="Best Value"
                    onClick={() => setSelectedPurchase("annual")}
                  />
                </div>
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="Tournament Selection"
                  subtitle="Featured events are shown first so creators can launch pools faster for majors, playoffs, LIV events, and high-demand tournaments."
                  right={
                    <Badge variant="muted">
                      {loadingTournaments
                        ? "Loading"
                        : `${tournaments.length} tournament${
                            tournaments.length === 1 ? "" : "s"
                          }`}
                    </Badge>
                  }
                />

                <div className="mt-6 space-y-7">
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
                      {featuredTournaments.length > 0 ? (
                        <div>
                          <div className="mb-4 flex items-end justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                                Featured Events
                              </p>
                              <p className="mt-1 text-sm leading-6 text-neutral-500">
                                Majors, playoffs, LIV events, and tournaments most likely to drive group pools.
                              </p>
                            </div>

                            <Badge variant="success">Priority</Badge>
                          </div>

                          <div className="space-y-4">
                            {featuredTournaments.map((tournament) => (
                              <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                isSelected={tournament.id === selectedTournamentId}
                                onClick={() => setSelectedTournamentId(tournament.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {standardTournaments.length > 0 ? (
                        <div>
                          <div className="mb-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">
                              All Upcoming Tournaments
                            </p>
                            <p className="mt-1 text-sm leading-6 text-neutral-500">
                              Full catalog for weekly pools across PGA TOUR and LIV events.
                            </p>
                          </div>

                          <div className="space-y-4">
                            {standardTournaments.map((tournament) => (
                              <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                isSelected={tournament.id === selectedTournamentId}
                                onClick={() => setSelectedTournamentId(tournament.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="Pool Identity"
                  subtitle="Name it, price it, and set the first impression."
                />

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <Field label="Pool Name" hint="Required">
                    <TextInput
                      value={poolName}
                      onChange={(event) => setPoolName(event.target.value)}
                      placeholder="Sunday Money Club"
                    />
                  </Field>

                  <Field label="Entry Fee" hint={allowFreePool ? "Free group pool" : "Group buy-in"}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                        $
                      </span>

                      <TextInput
                        type="number"
                        min="0"
                        value={entryFee}
                        onChange={(event) => setEntryFee(event.target.value)}
                        disabled={allowFreePool}
                        className="pl-9"
                      />
                    </div>
                  </Field>

                  <Field label="Max Players" hint="Pool size">
                    <TextInput
                      type="number"
                      min="2"
                      value={maxPlayers}
                      onChange={(event) => setMaxPlayers(event.target.value)}
                    />
                  </Field>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-sm font-black text-white">Premium access</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      This pool uses the flagship Poolr creation flow. The creator unlocks
                      the premium pool; everyone else joins and plays free.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <FeaturePill label="FLAGSHIP FLOW" />
                    </div>
                  </div>
                </div>

                {selectedTournament ? (
                  <div className="mt-6 rounded-[26px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                      Selected Tournament
                    </p>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight text-white">
                          {selectedTournament.name}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-neutral-300">
                          {formatTournamentMeta(selectedTournament) ||
                            "Tournament details ready"}
                        </p>
                      </div>

                      <Badge variant={statusTone(selectedTournament.status) as "default" | "success" | "muted"}>
                        {selectedTournament.status || "upcoming"}
                      </Badge>
                    </div>
                  </div>
                ) : null}
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="Format + Roster Rules"
                  subtitle="The core game engine. Keep it clear and fair."
                />

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <Field label="Draft Format">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDraftFormat("salary_cap")}
                        className={cn(
                          "rounded-[22px] border px-4 py-3.5 text-sm font-black transition",
                          draftFormat === "salary_cap"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-black/20 text-white hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        Salary Cap
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftFormat("tiered_draft")}
                        className={cn(
                          "rounded-[22px] border px-4 py-3.5 text-sm font-black transition",
                          draftFormat === "tiered_draft"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-black/20 text-white hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        Tiered Draft
                      </button>
                    </div>
                  </Field>

                  <Field label="Roster Size" hint="Max 10">
                    <SelectInput
                      value={rosterSize}
                      onChange={(event) => setRosterSize(Number(event.target.value))}
                    >
                      {ROSTER_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-[#061121]">
                          {option} golfers
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  <Field label="Players Counted" hint="Best scores">
                    <SelectInput
                      value={playersCounted}
                      onChange={(event) => setPlayersCounted(Number(event.target.value))}
                    >
                      {countedOptions.map((option) => (
                        <option key={option} value={option} className="bg-[#061121]">
                          Best {option} count
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  {draftFormat === "salary_cap" ? (
                    <Field label="Salary Cap" hint="Fake budget">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                          $
                        </span>

                        <TextInput
                          type="number"
                          min="1"
                          value={salaryCap}
                          onChange={(event) => setSalaryCap(event.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </Field>
                  ) : (
                    <Field label="Tier Rule" hint="Default">
                      <TextInput
                        value={tierRule}
                        onChange={(event) => setTierRule(event.target.value)}
                        placeholder="1 player from each tier"
                      />
                    </Field>
                  )}
                </div>

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <p className="text-sm font-black text-white">Roster rule check</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    Each team picks {rosterSize} golfers. The best {playersCounted}
                    {playersCounted === 1 ? " score counts" : " scores count"} toward
                    the leaderboard.
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="Premium Features"
                  subtitle="The features that make this feel like Poolr, not a spreadsheet."
                />

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="text-sm font-black text-white">Live scoring extras</p>

                    <div className="mt-4 grid gap-3">
                      <Toggle
                        label="Round leader bonus"
                        description="Reward momentum when someone has the leader."
                        checked={bonusLeader}
                        onChange={() => setBonusLeader((previous) => !previous)}
                      />
                      <Toggle
                        label="Top 5 round bonus"
                        description="Create movement during each round."
                        checked={bonusTop5}
                        onChange={() => setBonusTop5((previous) => !previous)}
                      />
                      <Toggle
                        label="Top 10 round bonus"
                        description="Add smaller live scoring moments."
                        checked={bonusTop10}
                        onChange={() => setBonusTop10((previous) => !previous)}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-black text-white">Pool energy</p>

                    <div className="mt-4 grid gap-3">
                      <Toggle
                        label="Live leaderboard"
                        description="Make the pool feel active during the tournament."
                        checked={showLiveLeaderboard}
                        onChange={() =>
                          setShowLiveLeaderboard((previous) => !previous)
                        }
                      />
                      <Toggle
                        label="Pool chat / trash talk"
                        description="Keep the social side alive."
                        checked={allowTrashTalk}
                        onChange={() => setAllowTrashTalk((previous) => !previous)}
                      />
                      <Toggle
                        label="Hide rosters until lock"
                        description="Keep picks private until the tournament starts."
                        checked={hideRostersUntilLock}
                        onChange={() =>
                          setHideRostersUntilLock((previous) => !previous)
                        }
                      />
                      <Toggle
                        label="Free group pool"
                        description="Set the group buy-in to $0. This is separate from Poolr access."
                        checked={allowFreePool}
                        onChange={() => setAllowFreePool((previous) => !previous)}
                      />
                    </div>
                  </div>
                </div>

                {(errorMessage || successMessage) && (
                  <div
                    className={cn(
                      "mt-6 rounded-[24px] border p-4",
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

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCreatePool}
                    disabled={
                      isSaving ||
                      loadingTournaments ||
                      loadingCreator ||
                      loadingPoolrUser
                    }
                    className="rounded-[24px] bg-emerald-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Launching Premium Pool..." : launchLabel}
                  </button>

                  <Link
                    href="/join-pool"
                    className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    Go to Join Pool
                  </Link>
                </div>

                {createdCode ? (
                  <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                      Invite Link
                    </p>

                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-3xl font-black tracking-[0.28em] text-white">
                          {createdCode}
                        </p>

                        <p className="mt-2 break-all text-sm text-neutral-400">
                          {createdInviteLink || previewJoinLink}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
                      >
                        {copied ? "Copied" : "Copy Invite Link"}
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {createdPoolId ? (
                        <>
                          <button
                            type="button"
                            onClick={() => router.push(`/pool/${createdPoolId}`)}
                            className="rounded-[22px] bg-emerald-500 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-400"
                          >
                            Go to Pool Lobby
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/pool/${createdPoolId}/manage`)
                            }
                            className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                          >
                            Manage Pool
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </GlassCard>
            </section>

            <aside className="space-y-6">
              <GlassCard className="sticky top-6 p-6 sm:p-7">
                <SectionHeader
                  title="Premium Pool Preview"
                  subtitle="This should feel elite before anyone even joins."
                />

                <div className="mt-6 space-y-4">
                  <PreviewRow
                    label="Pool Name"
                    value={poolName || "Untitled Premium Pool"}
                    highlight
                  />
                  <PreviewRow
                    label="Tournament"
                    value={selectedTournament?.name || "No tournament selected"}
                  />
                  <PreviewRow
                    label="Location"
                    value={selectedTournamentMeta || "Course TBD"}
                  />
                  <PreviewRow
                    label="Poolr Access"
                    value={`${purchaseLabel(selectedPurchase)} — ${purchasePriceText(selectedPurchase)}`}
                  />
                  <PreviewRow
                    label="Group Buy-In"
                    value={
                      allowFreePool || Number(entryFee) === 0
                        ? "Free group pool"
                        : formatCurrency(entryFee)
                    }
                  />
                  <PreviewRow label="Format" value={displayFormat(draftFormat)} />
                  <PreviewRow label="Roster Size" value={`${rosterSize} golfers`} />
                  <PreviewRow label="Players Counted" value={`${playersCounted} count`} />
                  <PreviewRow
                    label={draftFormat === "salary_cap" ? "Salary Cap" : "Tier Rule"}
                    value={
                      draftFormat === "salary_cap"
                        ? formatCurrency(salaryCap)
                        : tierRule || "1 player from each tier"
                    }
                  />
                  <PreviewRow
                    label="Invite Link"
                    value={createdCode ? createdCode : "Generated on launch"}
                  />
                </div>
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="What This Premium Pool Unlocks"
                  subtitle="The setup communicates emotion, competition, and quality."
                />

                <div className="mt-6 grid gap-3">
                  <PreviewRow
                    label="Live Leaderboard"
                    value={showLiveLeaderboard ? "On — DataGolf-ready" : "Off"}
                  />
                  <PreviewRow
                    label="Chat + Trash Talk"
                    value={allowTrashTalk ? "On — social energy enabled" : "Off"}
                  />
                  <PreviewRow
                    label="Roster Privacy"
                    value={hideRostersUntilLock ? "Hidden until lock" : "Visible before start"}
                  />
                  <PreviewRow
                    label="Bonus Scoring"
                    value={`${bonusCount} live scoring bonus${
                      bonusCount === 1 ? "" : "es"
                    } active`}
                  />
                </div>
              </GlassCard>

              <GlassCard className="p-6 sm:p-7">
                <SectionHeader
                  title="Launch Checklist"
                  subtitle="Everything this page saves when you launch."
                />

                <div className="mt-6 space-y-3">
                  <PreviewRow label="Pool record" value="Saved to Supabase" />
                  <PreviewRow label="Tournament ID" value="Connected correctly" />
                  <PreviewRow label="Invite code" value="Generated automatically" />
                  <PreviewRow label="Product access" value="Tracked in Supabase" />
                  <PreviewRow label="Creator account" value="Connected to Poolr user" />
                  <PreviewRow label="Join URL" value="/join-pool?code=CODE" />
                  <PreviewRow label="Redirect" value="New pool lobby" />
                </div>
              </GlassCard>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
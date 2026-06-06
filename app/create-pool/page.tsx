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
type StepKey = "tournament" | "setup" | "unlock";

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
const CREATE_POOL_PATH = "/create-pool";

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

function formatTournamentDates(tournament: Tournament | null) {
  if (!tournament) return "Select a tournament";

  const start = formatDate(tournament.start_date || tournament.lock_time);
  const end = formatDate(tournament.end_date);

  if (start && end && start !== end) return `${start} – ${end}`;
  return start || "Dates coming soon";
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

function getTournamentLabel(tournament: Tournament | null) {
  if (!tournament) return "Tournament";
  if (tournament.feature_label) return tournament.feature_label;
  if (tournament.is_major) return "Major Championship";
  if (tournament.is_signature) return "Signature Event";

  const tier = String(tournament.event_tier ?? "").toLowerCase();

  if (tier === "liv") return "LIV Golf";
  if (tier === "playoff") return "FedExCup Playoffs";
  if (tier === "team-event") return "Team Event";
  if (tier === "fall") return "FedExCup Fall";
  if (tier === "co-sanctioned") return "Co-Sanctioned Event";

  return tournament.tour || "Tournament";
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
  if (value === "hidden" || value === "final" || value === "archived") return "muted";
  return "default";
}

function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "muted" | "danger" | "gold";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]",
        variant === "success" &&
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
        variant === "default" && "border-white/12 bg-white/5 text-white/80",
        variant === "muted" && "border-white/10 bg-black/20 text-neutral-400",
        variant === "danger" && "border-red-400/20 bg-red-400/10 text-red-200",
        variant === "gold" && "border-amber-300/25 bg-amber-300/10 text-amber-200"
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
        "rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.085),rgba(255,255,255,0.035))] shadow-[0_28px_110px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
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
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
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
        "relative rounded-[28px] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
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

function StepTab({
  number,
  title,
  description,
  active,
  complete,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  active: boolean;
  complete?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[24px] border p-4 text-left transition",
        active
          ? "border-emerald-400/35 bg-emerald-400/10"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-black",
            active || complete ? "bg-emerald-400 text-black" : "bg-white/10 text-white"
          )}
        >
          {complete ? "✓" : number}
        </span>
        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p>
        </div>
      </div>
    </button>
  );
}

function SpotlightTournamentCard({
  tournament,
  isSelected,
  onClick,
}: {
  tournament: Tournament;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[28px] border p-5 text-left transition",
        isSelected
          ? "border-emerald-400/45 bg-emerald-400/12 shadow-[0_20px_80px_rgba(16,185,129,0.12)]"
          : "border-white/10 bg-black/20 hover:border-emerald-400/25 hover:bg-emerald-400/[0.055]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <Badge variant={tournament.is_major ? "gold" : "success"}>
            {getTournamentLabel(tournament)}
          </Badge>
          <h3 className="text-2xl font-black tracking-tight text-white">
            {tournament.name}
          </h3>
          <p className="text-sm leading-6 text-neutral-400">
            {tournament.course || tournament.location || "Tournament details"}
          </p>
        </div>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black",
            isSelected
              ? "border-emerald-400 bg-emerald-400 text-black"
              : "border-white/15 text-white/40"
          )}
        >
          {isSelected ? "✓" : ""}
        </span>
      </div>
      <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-neutral-200">
        {formatTournamentDates(tournament)}
      </div>
    </button>
  );
}

function SummaryPanel({
  selectedTournament,
  poolName,
  entryFee,
  allowFreePool,
  draftFormat,
  rosterSize,
  playersCounted,
  salaryCap,
  maxPlayers,
  bonusCount,
}: {
  selectedTournament: Tournament | null;
  poolName: string;
  entryFee: number;
  allowFreePool: boolean;
  draftFormat: DraftFormat;
  rosterSize: number;
  playersCounted: number;
  salaryCap: string;
  maxPlayers: string;
  bonusCount: number;
}) {
  const maxPlayersNumber = Number(maxPlayers || 0);
  const projectedPot = maxPlayersNumber > 0 ? entryFee * maxPlayersNumber : 0;

  return (
    <GlassCard className="p-6 sm:p-7 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
            Pool Preview
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            {poolName.trim() || "Untitled Pool"}
          </h2>
        </div>
        <Badge variant="success">Premium</Badge>
      </div>

      <div className="mt-6 grid gap-3">
        <PreviewRow
          label="Tournament"
          value={selectedTournament?.name || "Choose tournament"}
          highlight
        />
        <PreviewRow
          label="Course + Location"
          value={
            selectedTournament
              ? selectedTournament.course || selectedTournament.location || "Details coming soon"
              : "Select an event first"
          }
        />
        <PreviewRow label="Dates" value={formatTournamentDates(selectedTournament)} />
        <PreviewRow label="Format" value={displayFormat(draftFormat)} />
        <PreviewRow
          label="Roster"
          value={`${rosterSize} golfers • best ${playersCounted} count`}
        />
        <PreviewRow
          label="Group Buy-In"
          value={allowFreePool ? "$0 free group pool" : formatCurrency(entryFee)}
        />
        {draftFormat === "salary_cap" ? (
          <PreviewRow label="Salary Cap" value={formatCurrency(salaryCap)} />
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StatBox
          label="Pool Size"
          value={`${maxPlayersNumber || 0}`}
          detail="Maximum players allowed"
        />
        <StatBox
          label="Projected Pot"
          value={formatCurrency(projectedPot)}
          detail="Tracked by the manager"
        />
      </div>

      <div className="mt-6 rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] p-5">
        <p className="text-sm font-black text-white">What players get</p>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Live standings, private rosters before lock, invite code access, chat energy,
          and {bonusCount} active scoring bonus{bonusCount === 1 ? "" : "es"}.
        </p>
      </div>
    </GlassCard>
  );
}

export default function CreatePoolPage() {
  const router = useRouter();

  const [step, setStep] = useState<StepKey>("tournament");
  const [showFullSchedule, setShowFullSchedule] = useState(false);

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
        setSelectedPurchase(
          poolrUser?.has_used_free_pool_experience ? "single_pool" : "free_first_pool"
        );
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

  const featuredTournaments = useMemo(
    () =>
      tournaments
        .filter((tournament) => tournament.is_featured || tournament.is_major)
        .sort(sortTournaments)
        .slice(0, 6),
    [tournaments]
  );

  const standardTournaments = useMemo(
    () => tournaments.filter((tournament) => !tournament.is_featured && !tournament.is_major),
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
      ? "Launch Pool"
      : selectedPurchase === "single_pool"
        ? "Continue to Checkout — $9.99"
        : selectedPurchase === "monthly"
          ? "Continue to Checkout — $9.99/mo"
          : "Continue to Checkout — $59.99/yr";

  function chooseTournament(id: string) {
    setSelectedTournamentId(id);
  }

  function continueFromTournament() {
    if (!selectedTournamentId) {
      setErrorMessage("Select a tournament to continue.");
      return;
    }
    setErrorMessage("");
    setStep("setup");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueFromSetup() {
    const validationError = validateSetupOnly();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage("");
    setStep("unlock");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function validateSetupOnly() {
    if (!poolrUserId) return "Create your Poolr account before launching a pool.";
    if (!poolName.trim()) return "Enter a pool name.";
    if (!selectedTournamentId) return "Select a tournament.";

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

  function validateForm() {
    const setupError = validateSetupOnly();
    if (setupError) return setupError;

    if (!freePoolAvailable && selectedPurchase === "free_first_pool") {
      return "Your free Poolr experience has already been used. Choose Single Pool, Monthly, or Annual.";
    }

    if (!hasActivePlan && selectedPurchase !== "free_first_pool") {
      return "Stripe checkout is the next step. Once Stripe is connected, this option will continue to checkout.";
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

      setCreatedCode(finalInviteCode);
      setCreatedInviteLink(inviteLink);
      setSuccessMessage("Your Poolr pool is live. Redirecting to the lobby...");

      window.setTimeout(() => {
        router.push(`/pool/${createdPool.id}`);
      }, 650);
    } catch (error) {
      console.error("Failed to create pool:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your Poolr pool."
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

        <div className="relative mx-auto max-w-[1480px] px-5 pb-16 pt-10 sm:px-6 sm:pb-20 lg:px-8 lg:pt-16">
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <section>
              <Badge variant="success">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Create Pool
              </Badge>

              <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-7xl">
                Build the golf pool your group wants to run back.
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">
                Pick the tournament, set the format, invite your group, and let Poolr handle the live competition.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <FeaturePill label="Live standings" />
                <FeaturePill label="Private rosters" />
                <FeaturePill label="Bonus moments" />
                <FeaturePill label="Invite code" />
              </div>
            </section>

            <GlassCard className="p-6 sm:p-7">
              <div className="grid gap-4 md:grid-cols-3">
                <StepTab
                  number="1"
                  title="Tournament"
                  description="Choose the event."
                  active={step === "tournament"}
                  complete={Boolean(selectedTournamentId) && step !== "tournament"}
                  onClick={() => setStep("tournament")}
                />
                <StepTab
                  number="2"
                  title="Rules"
                  description="Set the format."
                  active={step === "setup"}
                  complete={step === "unlock"}
                  onClick={() => setStep("setup")}
                />
                <StepTab
                  number="3"
                  title="Launch"
                  description="Confirm access."
                  active={step === "unlock"}
                  onClick={() => setStep("unlock")}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <StatBox
                  label="Tournament"
                  value={selectedTournament?.name || "Pick one"}
                  detail={formatTournamentDates(selectedTournament)}
                />
                <StatBox
                  label="Format"
                  value={displayFormat(draftFormat)}
                  detail={`${rosterSize} golfers • best ${playersCounted} count`}
                />
                <StatBox
                  label="Group Buy-In"
                  value={allowFreePool ? "$0" : formatCurrency(entryFeeNumber)}
                  detail="Tracked by the manager"
                />
              </div>
            </GlassCard>
          </div>

          <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:items-start">
            <section className="space-y-8">
              {step === "tournament" ? (
                <GlassCard className="p-6 sm:p-8">
                  <SectionHeader
                    eyebrow="Step 1"
                    title="Choose the tournament"
                    subtitle="The biggest events are surfaced first. Open the full schedule only when you need a weekly or alternate event."
                    right={
                      <Badge variant="muted">
                        {loadingTournaments ? "Loading" : `${tournaments.length} events`}
                      </Badge>
                    }
                  />

                  <div className="mt-8">
                    {loadingTournaments ? (
                      <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 text-neutral-400">
                        Loading tournaments...
                      </div>
                    ) : tournaments.length === 0 ? (
                      <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 text-neutral-400">
                        No tournaments available yet.
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          {featuredTournaments.map((tournament) => (
                            <SpotlightTournamentCard
                              key={tournament.id}
                              tournament={tournament}
                              isSelected={tournament.id === selectedTournamentId}
                              onClick={() => chooseTournament(tournament.id)}
                            />
                          ))}
                        </div>

                        <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                              <p className="text-sm font-black text-white">Full schedule</p>
                              <p className="mt-1 text-sm leading-6 text-neutral-400">
                                Use this for weekly PGA TOUR, LIV, and fall events.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowFullSchedule((current) => !current)}
                              className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                            >
                              {showFullSchedule ? "Hide schedule" : "Browse full schedule"}
                            </button>
                          </div>

                          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                            <SelectInput
                              value={selectedTournamentId}
                              onChange={(event) => chooseTournament(event.target.value)}
                            >
                              {tournaments.map((tournament) => (
                                <option key={tournament.id} value={tournament.id}>
                                  {tournament.name} — {formatTournamentDates(tournament)}
                                </option>
                              ))}
                            </SelectInput>

                            <Badge variant={statusTone(selectedTournament?.status) as "default" | "success" | "muted"}>
                              {selectedTournament?.status || "upcoming"}
                            </Badge>
                          </div>

                          {showFullSchedule ? (
                            <div className="mt-5 max-h-[420px] space-y-3 overflow-auto pr-1">
                              {standardTournaments.map((tournament) => (
                                <button
                                  type="button"
                                  key={tournament.id}
                                  onClick={() => chooseTournament(tournament.id)}
                                  className={cn(
                                    "flex w-full flex-col gap-2 rounded-[22px] border p-4 text-left transition sm:flex-row sm:items-center sm:justify-between",
                                    tournament.id === selectedTournamentId
                                      ? "border-emerald-400/35 bg-emerald-400/10"
                                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                                  )}
                                >
                                  <div>
                                    <p className="font-black text-white">{tournament.name}</p>
                                    <p className="mt-1 text-sm text-neutral-400">
                                      {formatTournamentMeta(tournament)}
                                    </p>
                                  </div>
                                  <Badge variant="muted">{getTournamentLabel(tournament)}</Badge>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={continueFromTournament}
                            className="rounded-[24px] bg-emerald-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-emerald-300"
                          >
                            Continue to Pool Rules
                          </button>
                          <Link
                            href="/join-pool"
                            className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-3.5 text-center text-sm font-black text-white transition hover:bg-white/10"
                          >
                            Join an Existing Pool
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </GlassCard>
              ) : null}

              {step === "setup" ? (
                <div className="space-y-8">
                  <GlassCard className="p-6 sm:p-8">
                    <SectionHeader
                      eyebrow="Step 2"
                      title="Set up the pool"
                      subtitle="Name it, set the group buy-in, and choose the rules before access or checkout appears."
                    />

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                      <Field label="Pool Name" hint="Required">
                        <TextInput
                          value={poolName}
                          onChange={(event) => setPoolName(event.target.value)}
                          placeholder="Sunday Money Club"
                        />
                      </Field>

                      <Field label="Group Buy-In" hint={allowFreePool ? "Free group pool" : "Tracked by manager"}>
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
                        <p className="text-sm font-black text-white">Creator pays. Everyone joins.</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">
                          Poolr access is separate from your group buy-in. The group buy-in is only tracked for your pool manager.
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  <div className="grid gap-8 lg:grid-cols-2">
                    <GlassCard className="p-6 sm:p-8">
                      <SectionHeader
                        title="Format + roster"
                        subtitle="Simple enough for the group, flexible enough for serious players."
                      />

                      <div className="mt-8 grid gap-6">
                        <Field label="Draft Format">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setDraftFormat("salary_cap")}
                              className={cn(
                                "rounded-[22px] border px-5 py-4 text-sm font-black transition",
                                draftFormat === "salary_cap"
                                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                                  : "border-white/10 bg-black/20 text-white hover:bg-white/[0.04]"
                              )}
                            >
                              Salary Cap
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraftFormat("tiered_draft")}
                              className={cn(
                                "rounded-[22px] border px-5 py-4 text-sm font-black transition",
                                draftFormat === "tiered_draft"
                                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                                  : "border-white/10 bg-black/20 text-white hover:bg-white/[0.04]"
                              )}
                            >
                              Tiered Draft
                            </button>
                          </div>
                        </Field>

                        <div className="grid gap-6 md:grid-cols-2">
                          <Field label="Roster Size" hint="Max 10">
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

                          <Field label="Players Counted" hint="Best scores">
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
                        </div>

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
                          <Field label="Tier Rule">
                            <TextInput
                              value={tierRule}
                              onChange={(event) => setTierRule(event.target.value)}
                              placeholder="1 player from each tier"
                            />
                          </Field>
                        )}

                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                          <p className="text-sm font-black text-white">Roster rule</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-400">
                            Each team picks {rosterSize} golfers. The best {playersCounted} score{playersCounted === 1 ? "" : "s"} count toward the leaderboard.
                          </p>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-6 sm:p-8">
                      <SectionHeader
                        title="Poolr experience"
                        subtitle="Turn on the features that make the tournament feel alive."
                      />

                      <div className="mt-8 grid gap-3">
                        <Toggle
                          label="Live standings"
                          description="Players can follow the leaderboard during the tournament."
                          checked={showLiveLeaderboard}
                          onChange={() => setShowLiveLeaderboard((previous) => !previous)}
                        />
                        <Toggle
                          label="Hide rosters until lock"
                          description="Keep picks private until the tournament starts."
                          checked={hideRostersUntilLock}
                          onChange={() => setHideRostersUntilLock((previous) => !previous)}
                        />
                        <Toggle
                          label="Pool chat"
                          description="Keep the group energy and trash talk inside the pool."
                          checked={allowTrashTalk}
                          onChange={() => setAllowTrashTalk((previous) => !previous)}
                        />
                        <Toggle
                          label="Round leader bonus"
                          description="Reward the player holding the lead after each round."
                          checked={bonusLeader}
                          onChange={() => setBonusLeader((previous) => !previous)}
                        />
                        <Toggle
                          label="Top 5 round bonus"
                          description="Create extra leaderboard movement throughout the event."
                          checked={bonusTop5}
                          onChange={() => setBonusTop5((previous) => !previous)}
                        />
                        <Toggle
                          label="Top 10 round bonus"
                          description="Add smaller scoring moments for more teams."
                          checked={bonusTop10}
                          onChange={() => setBonusTop10((previous) => !previous)}
                        />
                        <Toggle
                          label="Free group pool"
                          description="Set the group buy-in to $0. Poolr access is handled separately."
                          checked={allowFreePool}
                          onChange={() => setAllowFreePool((previous) => !previous)}
                        />
                      </div>
                    </GlassCard>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep("tournament")}
                      className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Back to Tournament
                    </button>
                    <button
                      type="button"
                      onClick={continueFromSetup}
                      className="rounded-[24px] bg-emerald-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-emerald-300"
                    >
                      Review Pool
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "unlock" ? (
                <div className="space-y-8">
                  <GlassCard className="p-6 sm:p-8">
                    <SectionHeader
                      eyebrow="Step 3"
                      title="Review and launch"
                      subtitle="Your pool is ready. Confirm Poolr access, then launch the lobby and share the invite code."
                      right={
                        <Badge variant={freePoolAvailable || hasActivePlan ? "success" : "muted"}>
                          {loadingPoolrUser || loadingCreator
                            ? "Loading"
                            : hasActivePlan
                              ? "Plan active"
                              : freePoolAvailable
                                ? "Free launch available"
                                : "Checkout required"}
                        </Badge>
                      }
                    />

                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <PricingCard
                        title="Free First Pool"
                        price="$0"
                        description="Your first Poolr experience lets the group try the full product."
                        selected={selectedPurchase === "free_first_pool"}
                        disabled={!freePoolAvailable || hasActivePlan}
                        badge={freePoolAvailable ? "Available" : "Used"}
                        onClick={() => setSelectedPurchase("free_first_pool")}
                      />

                      <PricingCard
                        title="Single Pool"
                        price="$9.99"
                        description="Run one Poolr pool for one tournament."
                        selected={selectedPurchase === "single_pool"}
                        disabled={hasActivePlan}
                        badge="Default"
                        onClick={() => setSelectedPurchase("single_pool")}
                      />

                      <PricingCard
                        title="Monthly Pro"
                        price="$9.99/mo"
                        description="Run unlimited pools while your plan is active."
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

                    <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
                      <p className="text-sm font-black text-white">Poolr access</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        One creator unlocks the pool. Everyone else joins free. Group buy-ins are only tracked by the pool manager.
                      </p>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6 sm:p-8">
                    <SectionHeader
                      title="What you get with Poolr"
                      subtitle="Built for the tournament weekend: clear rules, fast invites, and a live game your group can follow together."
                    />

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <PreviewRow label="Live standings" value="Leaderboard updates throughout the event" highlight />
                      <PreviewRow label="Private picks" value="Rosters stay hidden until lock" />
                      <PreviewRow label="Bonus moments" value={`${bonusCount} live scoring bonuses active`} />
                      <PreviewRow label="Invite flow" value="Share one code or link with the group" />
                    </div>
                  </GlassCard>

                  {(errorMessage || successMessage) && (
                    <div
                      className={cn(
                        "rounded-[24px] border p-4",
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

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep("setup")}
                      className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Back to Rules
                    </button>
                    <button
                      type="button"
                      onClick={handleCreatePool}
                      disabled={
                        isSaving ||
                        loadingTournaments ||
                        loadingCreator ||
                        loadingPoolrUser
                      }
                      className="rounded-[24px] bg-emerald-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Launching Pool..." : launchLabel}
                    </button>
                    <Link
                      href="/join-pool"
                      className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-3.5 text-center text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Join Pool
                    </Link>
                  </div>

                  {createdCode ? (
                    <GlassCard className="p-6 sm:p-7">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Invite Link
                      </p>
                      <p className="mt-3 break-all text-lg font-black text-white">
                        {createdInviteLink || previewJoinLink || createdCode}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="mt-5 rounded-[20px] bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-white/90"
                      >
                        {copied ? "Copied" : "Copy Invite"}
                      </button>
                    </GlassCard>
                  ) : null}
                </div>
              ) : null}
            </section>

            <SummaryPanel
              selectedTournament={selectedTournament}
              poolName={poolName}
              entryFee={entryFeeNumber}
              allowFreePool={allowFreePool}
              draftFormat={draftFormat}
              rosterSize={rosterSize}
              playersCounted={playersCounted}
              salaryCap={salaryCap}
              maxPlayers={maxPlayers}
              bonusCount={bonusCount}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

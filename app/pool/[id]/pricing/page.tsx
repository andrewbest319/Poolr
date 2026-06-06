"use client";

import React, { useMemo, useState } from "react";

type PricingMode = "salary-cap" | "tiered-draft";
type SortKey = "rank" | "salaryHigh" | "salaryLow" | "name";

type Golfer = {
  id: string;
  name: string;
  country: string;
  salary: number;
  tier: number;
  odds: string;
  worldRank: number;
  form: string;
  featured?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function currency(value: number) {
  return `$${value.toLocaleString()}`;
}

function ActionButton({
  children,
  variant = "primary",
  className,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit";
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
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
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
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-400/10"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none transition focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-400/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0b1020] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

const initialGolfers: Golfer[] = [
  { id: "1", name: "Scottie Scheffler", country: "USA", salary: 12000, tier: 1, odds: "+400", worldRank: 1, form: "Elite", featured: true },
  { id: "2", name: "Rory McIlroy", country: "NIR", salary: 11200, tier: 1, odds: "+750", worldRank: 2, form: "Hot", featured: true },
  { id: "3", name: "Jon Rahm", country: "ESP", salary: 10900, tier: 1, odds: "+900", worldRank: 3, form: "Strong", featured: true },
  { id: "4", name: "Xander Schauffele", country: "USA", salary: 10400, tier: 1, odds: "+1100", worldRank: 4, form: "Strong" },
  { id: "5", name: "Ludvig Aberg", country: "SWE", salary: 10100, tier: 1, odds: "+1400", worldRank: 5, form: "Hot", featured: true },
  { id: "6", name: "Collin Morikawa", country: "USA", salary: 9800, tier: 2, odds: "+1800", worldRank: 6, form: "Strong" },
  { id: "7", name: "Viktor Hovland", country: "NOR", salary: 9500, tier: 2, odds: "+2000", worldRank: 7, form: "Solid" },
  { id: "8", name: "Patrick Cantlay", country: "USA", salary: 9300, tier: 2, odds: "+2200", worldRank: 8, form: "Solid" },
  { id: "9", name: "Brooks Koepka", country: "USA", salary: 9100, tier: 2, odds: "+2500", worldRank: 9, form: "Strong" },
  { id: "10", name: "Tommy Fleetwood", country: "ENG", salary: 8900, tier: 2, odds: "+3000", worldRank: 10, form: "Solid" },
  { id: "11", name: "Hideki Matsuyama", country: "JPN", salary: 8700, tier: 2, odds: "+3200", worldRank: 11, form: "Solid" },
  { id: "12", name: "Jordan Spieth", country: "USA", salary: 8500, tier: 2, odds: "+3500", worldRank: 12, form: "Volatile" },
  { id: "13", name: "Tony Finau", country: "USA", salary: 8300, tier: 3, odds: "+4000", worldRank: 13, form: "Solid" },
  { id: "14", name: "Sahith Theegala", country: "USA", salary: 8100, tier: 3, odds: "+4500", worldRank: 14, form: "Hot" },
  { id: "15", name: "Cameron Smith", country: "AUS", salary: 8000, tier: 3, odds: "+4500", worldRank: 15, form: "Strong" },
  { id: "16", name: "Matt Fitzpatrick", country: "ENG", salary: 7800, tier: 3, odds: "+5000", worldRank: 16, form: "Solid" },
  { id: "17", name: "Robert MacIntyre", country: "SCO", salary: 7600, tier: 3, odds: "+5500", worldRank: 17, form: "Hot", featured: true },
  { id: "18", name: "Wyndham Clark", country: "USA", salary: 7400, tier: 3, odds: "+6000", worldRank: 18, form: "Strong" },
  { id: "19", name: "Russell Henley", country: "USA", salary: 7200, tier: 3, odds: "+6500", worldRank: 19, form: "Solid" },
  { id: "20", name: "Sam Burns", country: "USA", salary: 7000, tier: 3, odds: "+7000", worldRank: 20, form: "Volatile" },
  { id: "21", name: "Keegan Bradley", country: "USA", salary: 6900, tier: 4, odds: "+7000", worldRank: 21, form: "Solid" },
  { id: "22", name: "Shane Lowry", country: "IRL", salary: 6800, tier: 4, odds: "+7500", worldRank: 22, form: "Strong" },
  { id: "23", name: "Corey Conners", country: "CAN", salary: 6700, tier: 4, odds: "+8000", worldRank: 23, form: "Solid" },
  { id: "24", name: "Sungjae Im", country: "KOR", salary: 6600, tier: 4, odds: "+8000", worldRank: 24, form: "Solid" },
  { id: "25", name: "Min Woo Lee", country: "AUS", salary: 6500, tier: 4, odds: "+9000", worldRank: 25, form: "Hot" },
  { id: "26", name: "Justin Thomas", country: "USA", salary: 6400, tier: 4, odds: "+9000", worldRank: 26, form: "Volatile" },
  { id: "27", name: "Sepp Straka", country: "AUT", salary: 6300, tier: 4, odds: "+10000", worldRank: 27, form: "Solid" },
  { id: "28", name: "Jason Day", country: "AUS", salary: 6200, tier: 4, odds: "+10000", worldRank: 28, form: "Solid" },
  { id: "29", name: "Cameron Young", country: "USA", salary: 6100, tier: 4, odds: "+11000", worldRank: 29, form: "Volatile" },
  { id: "30", name: "Brian Harman", country: "USA", salary: 6000, tier: 4, odds: "+11000", worldRank: 30, form: "Solid" },
  { id: "31", name: "Harris English", country: "USA", salary: 5900, tier: 5, odds: "+12000", worldRank: 31, form: "Solid" },
  { id: "32", name: "Denny McCarthy", country: "USA", salary: 5800, tier: 5, odds: "+12000", worldRank: 32, form: "Solid" },
  { id: "33", name: "Adam Scott", country: "AUS", salary: 5700, tier: 5, odds: "+12500", worldRank: 33, form: "Strong" },
  { id: "34", name: "Nick Taylor", country: "CAN", salary: 5600, tier: 5, odds: "+13000", worldRank: 34, form: "Solid" },
  { id: "35", name: "Si Woo Kim", country: "KOR", salary: 5500, tier: 5, odds: "+14000", worldRank: 35, form: "Volatile" },
  { id: "36", name: "Tom Kim", country: "KOR", salary: 5450, tier: 5, odds: "+14500", worldRank: 36, form: "Hot" },
  { id: "37", name: "Lucas Glover", country: "USA", salary: 5400, tier: 5, odds: "+15000", worldRank: 37, form: "Solid" },
  { id: "38", name: "Akshay Bhatia", country: "USA", salary: 5350, tier: 5, odds: "+15000", worldRank: 38, form: "Hot" },
  { id: "39", name: "Byeong Hun An", country: "KOR", salary: 5300, tier: 5, odds: "+16000", worldRank: 39, form: "Strong" },
  { id: "40", name: "Chris Kirk", country: "USA", salary: 5250, tier: 5, odds: "+17000", worldRank: 40, form: "Solid" },
  { id: "41", name: "J.T. Poston", country: "USA", salary: 5100, tier: 6, odds: "+18000", worldRank: 41, form: "Solid" },
  { id: "42", name: "Mackenzie Hughes", country: "CAN", salary: 5000, tier: 6, odds: "+20000", worldRank: 42, form: "Solid" },
  { id: "43", name: "Taylor Pendrith", country: "CAN", salary: 4950, tier: 6, odds: "+20000", worldRank: 43, form: "Strong" },
  { id: "44", name: "Nicolai Hojgaard", country: "DEN", salary: 4900, tier: 6, odds: "+22000", worldRank: 44, form: "Hot" },
  { id: "45", name: "Matthieu Pavon", country: "FRA", salary: 4850, tier: 6, odds: "+22000", worldRank: 45, form: "Strong" },
  { id: "46", name: "Eric Cole", country: "USA", salary: 4800, tier: 6, odds: "+25000", worldRank: 46, form: "Solid" },
  { id: "47", name: "Will Zalatoris", country: "USA", salary: 4750, tier: 6, odds: "+25000", worldRank: 47, form: "Volatile" },
  { id: "48", name: "Thomas Detry", country: "BEL", salary: 4700, tier: 6, odds: "+30000", worldRank: 48, form: "Solid" },
  { id: "49", name: "Rickie Fowler", country: "USA", salary: 4650, tier: 6, odds: "+30000", worldRank: 49, form: "Volatile" },
  { id: "50", name: "Adrian Meronk", country: "POL", salary: 4600, tier: 6, odds: "+35000", worldRank: 50, form: "Solid" },
  { id: "51", name: "Davis Thompson", country: "USA", salary: 4550, tier: 6, odds: "+40000", worldRank: 51, form: "Hot" },
  { id: "52", name: "Brendon Todd", country: "USA", salary: 4500, tier: 6, odds: "+45000", worldRank: 52, form: "Solid" },
  { id: "53", name: "Ben An", country: "KOR", salary: 4450, tier: 6, odds: "+50000", worldRank: 53, form: "Strong" },
  { id: "54", name: "Emiliano Grillo", country: "ARG", salary: 4400, tier: 6, odds: "+50000", worldRank: 54, form: "Solid" },
  { id: "55", name: "Stephan Jaeger", country: "GER", salary: 4350, tier: 6, odds: "+55000", worldRank: 55, form: "Solid" },
  { id: "56", name: "Alex Noren", country: "SWE", salary: 4300, tier: 6, odds: "+60000", worldRank: 56, form: "Strong" },
  { id: "57", name: "Adam Hadwin", country: "CAN", salary: 4250, tier: 6, odds: "+65000", worldRank: 57, form: "Solid" },
  { id: "58", name: "Kurt Kitayama", country: "USA", salary: 4200, tier: 6, odds: "+70000", worldRank: 58, form: "Volatile" },
  { id: "59", name: "Thorbjorn Olesen", country: "DEN", salary: 4150, tier: 6, odds: "+75000", worldRank: 59, form: "Solid" },
  { id: "60", name: "Beau Hossler", country: "USA", salary: 4100, tier: 6, odds: "+80000", worldRank: 60, form: "Solid" },
];

export default function PricingPage() {
  const [pricingMode, setPricingMode] = useState<PricingMode>("salary-cap");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [tierFilter, setTierFilter] = useState("all");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [salaryCap, setSalaryCap] = useState("50000");
  const [golfers, setGolfers] = useState<Golfer[]>(initialGolfers);

  const filteredGolfers = useMemo(() => {
    let data = [...golfers];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (golfer) =>
          golfer.name.toLowerCase().includes(q) ||
          golfer.country.toLowerCase().includes(q) ||
          golfer.form.toLowerCase().includes(q)
      );
    }

    if (tierFilter !== "all") {
      data = data.filter((golfer) => golfer.tier === Number(tierFilter));
    }

    if (showFeaturedOnly) {
      data = data.filter((golfer) => golfer.featured);
    }

    switch (sortBy) {
      case "salaryHigh":
        data.sort((a, b) => b.salary - a.salary);
        break;
      case "salaryLow":
        data.sort((a, b) => a.salary - b.salary);
        break;
      case "name":
        data.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        data.sort((a, b) => a.worldRank - b.worldRank);
        break;
    }

    return data;
  }, [golfers, search, sortBy, tierFilter, showFeaturedOnly]);

  const featuredCount = golfers.filter((g) => g.featured).length;
  const tierCounts = useMemo(() => {
    return golfers.reduce<Record<number, number>>((acc, golfer) => {
      acc[golfer.tier] = (acc[golfer.tier] || 0) + 1;
      return acc;
    }, {});
  }, [golfers]);

  const updateGolfer = (
    id: string,
    field: "salary" | "tier" | "odds" | "worldRank" | "form",
    value: string
  ) => {
    setGolfers((prev) =>
      prev.map((golfer) =>
        golfer.id === id
          ? {
              ...golfer,
              [field]:
                field === "salary" || field === "tier" || field === "worldRank"
                  ? Number(value)
                  : value,
            }
          : golfer
      )
    );
  };

  const toggleFeatured = (id: string) => {
    setGolfers((prev) =>
      prev.map((golfer) =>
        golfer.id === id ? { ...golfer, featured: !golfer.featured } : golfer
      )
    );
  };

  const autoTierByRank = () => {
    setGolfers((prev) =>
      prev.map((golfer) => {
        let tier = 6;
        if (golfer.worldRank <= 5) tier = 1;
        else if (golfer.worldRank <= 12) tier = 2;
        else if (golfer.worldRank <= 20) tier = 3;
        else if (golfer.worldRank <= 30) tier = 4;
        else if (golfer.worldRank <= 40) tier = 5;
        return { ...golfer, tier };
      })
    );
  };

  const autoSalaryByRank = () => {
    setGolfers((prev) =>
      prev.map((golfer) => {
        const salary = Math.max(4000, 12200 - (golfer.worldRank - 1) * 140);
        return { ...golfer, salary };
      })
    );
  };

  const saveBoard = () => {
    console.log("Saved pricing board", {
      pricingMode,
      salaryCap,
      golfers,
    });
  };

  return (
    <main className="min-h-screen bg-[#040816] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-8%] top-[-5%] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[30%] h-[320px] w-[320px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-lg font-bold text-emerald-200">
              P
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                Poolr Pricing Board
              </p>
              <h1 className="text-xl font-semibold text-white">Golfer Pricing</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="ghost">Back to Manage Pool</ActionButton>
            <ActionButton variant="secondary" onClick={autoTierByRank}>
              Auto Tier by Rank
            </ActionButton>
            <ActionButton variant="secondary" onClick={autoSalaryByRank}>
              Auto Price by Rank
            </ActionButton>
            <ActionButton onClick={saveBoard}>Save Board</ActionButton>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,182,212,0.08),rgba(255,255,255,0.02))]" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  {pricingMode === "salary-cap" ? "Salary Cap Board" : "Tiered Draft Board"}
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  60+ Golfers Supported
                </span>
              </div>

              <h2 className="text-3xl font-semibold text-white sm:text-5xl">
                Tournament Player Board
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Control pricing, edit tiers, spotlight featured players, and keep the board
                clean enough for a premium commissioner experience. This page powers both the
                salary cap build and the tiered draft format.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatPill label="Total Golfers" value={String(golfers.length)} />
              <StatPill label="Featured" value={String(featuredCount)} />
              <StatPill label="Tier 1 Count" value={String(tierCounts[1] || 0)} />
              <StatPill label="Salary Cap" value={currency(Number(salaryCap))} />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <SectionCard title="Board Settings" subtitle="Configure the pricing model for this event.">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Board Mode"
                  value={pricingMode}
                  onChange={(value) => setPricingMode(value as PricingMode)}
                  options={[
                    { label: "Salary Cap", value: "salary-cap" },
                    { label: "Tiered Draft", value: "tiered-draft" },
                  ]}
                />

                <Input
                  label="Salary Cap"
                  value={salaryCap}
                  onChange={setSalaryCap}
                  type="number"
                  placeholder="50000"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                {pricingMode === "salary-cap"
                  ? "Salary cap mode uses each golfer's custom price. Users build rosters under the total budget."
                  : "Tiered draft mode uses each golfer's assigned tier. Users select players according to your tier rules."}
              </div>
            </SectionCard>

            <SectionCard title="Filters & Search" subtitle="Find golfers fast and keep the board manageable.">
              <div className="grid gap-4">
                <Input
                  label="Search"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search golfer, country, or form"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Sort By"
                    value={sortBy}
                    onChange={(value) => setSortBy(value as SortKey)}
                    options={[
                      { label: "World Rank", value: "rank" },
                      { label: "Salary High to Low", value: "salaryHigh" },
                      { label: "Salary Low to High", value: "salaryLow" },
                      { label: "Name", value: "name" },
                    ]}
                  />

                  <Select
                    label="Tier Filter"
                    value={tierFilter}
                    onChange={setTierFilter}
                    options={[
                      { label: "All Tiers", value: "all" },
                      { label: "Tier 1", value: "1" },
                      { label: "Tier 2", value: "2" },
                      { label: "Tier 3", value: "3" },
                      { label: "Tier 4", value: "4" },
                      { label: "Tier 5", value: "5" },
                      { label: "Tier 6", value: "6" },
                    ]}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowFeaturedOnly((prev) => !prev)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                    showFeaturedOnly
                      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 bg-black/20 text-slate-300"
                  )}
                >
                  Show featured golfers only
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Tier Breakdown" subtitle="Quick view of how the field is divided.">
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((tier) => (
                  <div
                    key={tier}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-sm font-semibold text-white">Tier {tier}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {tierCounts[tier] || 0} golfers assigned
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Golfer Board"
              subtitle="Edit salaries, tiers, odds, and featured status."
              right={
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  {filteredGolfers.length} showing
                </span>
              }
            >
              <div className="overflow-hidden rounded-3xl border border-white/10">
                <div className="hidden grid-cols-[1.7fr_0.65fr_0.8fr_0.75fr_0.7fr_0.9fr_0.8fr] bg-white/[0.04] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 lg:grid">
                  <div>Golfer</div>
                  <div>Rank</div>
                  <div>Salary</div>
                  <div>Tier</div>
                  <div>Odds</div>
                  <div>Form</div>
                  <div>Feature</div>
                </div>

                <div className="max-h-[920px] divide-y divide-white/10 overflow-y-auto">
                  {filteredGolfers.map((golfer) => (
                    <div
                      key={golfer.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[1.7fr_0.65fr_0.8fr_0.75fr_0.7fr_0.9fr_0.8fr] lg:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{golfer.name}</p>
                          {golfer.featured ? (
                            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200">
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{golfer.country}</p>
                      </div>

                      <div>
                        <input
                          type="number"
                          value={golfer.worldRank}
                          onChange={(e) =>
                            updateGolfer(golfer.id, "worldRank", e.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          value={golfer.salary}
                          onChange={(e) =>
                            updateGolfer(golfer.id, "salary", e.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"
                        />
                      </div>

                      <div>
                        <select
                          value={golfer.tier}
                          onChange={(e) => updateGolfer(golfer.id, "tier", e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"
                        >
                          {[1, 2, 3, 4, 5, 6].map((tier) => (
                            <option key={tier} value={tier} className="bg-[#0b1020] text-white">
                              Tier {tier}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={golfer.odds}
                          onChange={(e) => updateGolfer(golfer.id, "odds", e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"
                        />
                      </div>

                      <div>
                        <select
                          value={golfer.form}
                          onChange={(e) => updateGolfer(golfer.id, "form", e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"
                        >
                          {["Elite", "Hot", "Strong", "Solid", "Volatile"].map((form) => (
                            <option key={form} value={form} className="bg-[#0b1020] text-white">
                              {form}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => toggleFeatured(golfer.id)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
                            golfer.featured
                              ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20"
                              : "bg-white/5 text-slate-300 ring-1 ring-white/10"
                          )}
                        >
                          {golfer.featured ? "Featured" : "Standard"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
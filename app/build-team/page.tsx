"use client";

import { useMemo, useState, type ReactNode } from "react";

/* =========================================================
   EASY TO EDIT TOURNAMENT + GOLFER DATA
   ========================================================= */

type Golfer = {
  id: string;
  name: string;
  salary: number;
  tier?: string;
  form?: string;
};

type TournamentConfig = {
  id: string;
  name: string;
  subtitle: string;
  rosterSize: number;
  salaryCap: number;
  golfers: Golfer[];
};

const TOURNAMENTS: Record<string, TournamentConfig> = {
  masters2026: {
    id: "masters2026",
    name: "Masters 2026",
    subtitle: "Build your final lineup",
    rosterSize: 6,
    salaryCap: 50000,
    golfers: [
      { id: "scheffler", name: "Scottie Scheffler", salary: 11200, form: "Elite" },
      { id: "mcilroy", name: "Rory McIlroy", salary: 10900, form: "Elite" },
      { id: "rahm", name: "Jon Rahm", salary: 10600, form: "Elite" },
      { id: "schauffele", name: "Xander Schauffele", salary: 10300, form: "Elite" },
      { id: "aberg", name: "Ludvig Aberg", salary: 10000, form: "Elite" },
      { id: "morikawa", name: "Collin Morikawa", salary: 9800, form: "Strong" },
      { id: "hovland", name: "Viktor Hovland", salary: 9600, form: "Strong" },
      { id: "cantlay", name: "Patrick Cantlay", salary: 9400, form: "Strong" },
      { id: "fleetwood", name: "Tommy Fleetwood", salary: 9200, form: "Strong" },
      { id: "finau", name: "Tony Finau", salary: 9000, form: "Strong" },
      { id: "day", name: "Jason Day", salary: 8900, form: "Solid" },
      { id: "spieth", name: "Jordan Spieth", salary: 8800, form: "Solid" },
      { id: "hatton", name: "Tyrrell Hatton", salary: 8700, form: "Solid" },
      { id: "burns", name: "Sam Burns", salary: 8600, form: "Solid" },
      { id: "matsuyama", name: "Hideki Matsuyama", salary: 8500, form: "Strong" },
      { id: "theegala", name: "Sahith Theegala", salary: 8400, form: "Solid" },
      { id: "harman", name: "Brian Harman", salary: 8300, form: "Solid" },
      { id: "young", name: "Cameron Young", salary: 8200, form: "Upside" },
      { id: "clark", name: "Wyndham Clark", salary: 8100, form: "Solid" },
      { id: "fitzpatrick", name: "Matt Fitzpatrick", salary: 8000, form: "Solid" },
      { id: "fowler", name: "Rickie Fowler", salary: 7900, form: "Upside" },
      { id: "rose", name: "Justin Rose", salary: 7800, form: "Value" },
      { id: "an", name: "Byeong Hun An", salary: 7700, form: "Value" },
      { id: "lowry", name: "Shane Lowry", salary: 7600, form: "Value" },
      { id: "im", name: "Sungjae Im", salary: 7500, form: "Value" },
      { id: "kimtom", name: "Tom Kim", salary: 7400, form: "Value" },
      { id: "homa", name: "Max Homa", salary: 7300, form: "Upside" },
      { id: "akshay", name: "Akshay Bhatia", salary: 7200, form: "Value" },
      { id: "macintyre", name: "Robert MacIntyre", salary: 7100, form: "Value" },
      { id: "henley", name: "Russell Henley", salary: 7000, form: "Value" },
      { id: "conners", name: "Corey Conners", salary: 6950, form: "Value" },
      { id: "hoge", name: "Tom Hoge", salary: 6900, form: "Value" },
      { id: "djohnson", name: "Dustin Johnson", salary: 6850, form: "Value" },
      { id: "koepka", name: "Brooks Koepka", salary: 6800, form: "Upside" },
      { id: "reed", name: "Patrick Reed", salary: 6750, form: "Value" },
      { id: "niemann", name: "Joaquin Niemann", salary: 6700, form: "Value" },
      { id: "puig", name: "David Puig", salary: 6650, form: "Value" },
      { id: "smith", name: "Cameron Smith", salary: 6600, form: "Value" },
      { id: "dechambeau", name: "Bryson DeChambeau", salary: 6550, form: "Upside" },
      { id: "gooch", name: "Talor Gooch", salary: 6500, form: "Value" },
      { id: "woodland", name: "Gary Woodland", salary: 6450, form: "Value" },
      { id: "keegan", name: "Keegan Bradley", salary: 6400, form: "Value" },
      { id: "straka", name: "Sepp Straka", salary: 6350, form: "Value" },
      { id: "grillo", name: "Emiliano Grillo", salary: 6300, form: "Value" },
      { id: "poston", name: "J.T. Poston", salary: 6250, form: "Value" },
      { id: "dunlap", name: "Nick Dunlap", salary: 6200, form: "Upside" },
      { id: "thomas", name: "Justin Thomas", salary: 6150, form: "Upside" },
      { id: "english", name: "Harris English", salary: 6100, form: "Value" },
      { id: "mcnealy", name: "Maverick McNealy", salary: 6050, form: "Value" },
      { id: "moore", name: "Taylor Moore", salary: 6000, form: "Value" },
      { id: "mccarthy", name: "Denny McCarthy", salary: 5950, form: "Value" },
      { id: "glover", name: "Lucas Glover", salary: 5900, form: "Value" },
      { id: "bennett", name: "Sam Bennett", salary: 5850, form: "Value" },
      { id: "willett", name: "Danny Willett", salary: 5800, form: "Value" },
      { id: "zalatoris", name: "Will Zalatoris", salary: 5750, form: "Upside" },
      { id: "molinari", name: "Francesco Molinari", salary: 5700, form: "Value" },
      { id: "vanpelt", name: "Bo Van Pelt", salary: 5650, form: "Value" },
      { id: "snedeker", name: "Brandt Snedeker", salary: 5600, form: "Value" },
      { id: "kirk", name: "Chris Kirk", salary: 5550, form: "Value" },
      { id: "hojgaard", name: "Nicolai Hojgaard", salary: 5500, form: "Value" },
      { id: "cole", name: "Eric Cole", salary: 5450, form: "Value" },
      { id: "pendrith", name: "Taylor Pendrith", salary: 5400, form: "Value" },
      { id: "wallace", name: "Matt Wallace", salary: 5350, form: "Value" },
      { id: "bezuidenhout", name: "Christiaan Bezuidenhout", salary: 5300, form: "Value" },
      { id: "noren", name: "Alex Noren", salary: 5250, form: "Value" },
      { id: "hardy", name: "Nick Hardy", salary: 5200, form: "Value" },
      { id: "kimsiwoo", name: "Si Woo Kim", salary: 5150, form: "Value" },
      { id: "lee", name: "Min Woo Lee", salary: 5100, form: "Upside" },
      { id: "detry", name: "Thomas Detry", salary: 5050, form: "Value" },
      { id: "norlander", name: "Henrik Norlander", salary: 5000, form: "Value" },
    ],
  },

  pgaChampionship2026: {
    id: "pgaChampionship2026",
    name: "PGA Championship 2026",
    subtitle: "Edit this player pool for the next event",
    rosterSize: 6,
    salaryCap: 50000,
    golfers: [
      { id: "pga-scottie", name: "Scottie Scheffler", salary: 11100, form: "Elite" },
      { id: "pga-rory", name: "Rory McIlroy", salary: 10800, form: "Elite" },
      { id: "pga-ludvig", name: "Ludvig Aberg", salary: 10100, form: "Elite" },
      { id: "pga-xander", name: "Xander Schauffele", salary: 10000, form: "Strong" },
      { id: "pga-morikawa", name: "Collin Morikawa", salary: 9800, form: "Strong" },
      { id: "pga-rahm", name: "Jon Rahm", salary: 9700, form: "Strong" },
      { id: "pga-hovland", name: "Viktor Hovland", salary: 9500, form: "Strong" },
      { id: "pga-day", name: "Jason Day", salary: 9200, form: "Solid" },
      { id: "pga-hatton", name: "Tyrrell Hatton", salary: 8900, form: "Solid" },
      { id: "pga-macintyre", name: "Robert MacIntyre", salary: 7400, form: "Value" },
      { id: "pga-henley", name: "Russell Henley", salary: 7100, form: "Value" },
      { id: "pga-im", name: "Sungjae Im", salary: 7600, form: "Value" },
    ],
  },
};

type SortOption = "salary-desc" | "salary-asc" | "name-asc" | "name-desc";

const currency = (num: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconBase({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </IconBase>
  );
}

function TrophyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 5H5a2 2 0 0 0 0 4h2" />
    </IconBase>
  );
}

function DollarSignIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  );
}

function UsersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

function CheckCircle2Icon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

function XCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </IconBase>
  );
}

function SlidersHorizontalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M21 4H14" />
      <path d="M10 4H3" />
      <path d="M21 12H12" />
      <path d="M8 12H3" />
      <path d="M21 20H16" />
      <path d="M12 20H3" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="14" cy="20" r="2" />
    </IconBase>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export default function BuildTeamPage() {
  const tournamentKeys = Object.keys(TOURNAMENTS);
  const [selectedTournamentKey, setSelectedTournamentKey] = useState(tournamentKeys[0]);
  const tournament = TOURNAMENTS[selectedTournamentKey];

  const [selectedGolferIds, setSelectedGolferIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("salary-desc");
  const [formFilter, setFormFilter] = useState<string>("All");

  const selectedGolfers = useMemo(() => {
    return tournament.golfers.filter((g) => selectedGolferIds.includes(g.id));
  }, [tournament.golfers, selectedGolferIds]);

  const totalSalary = selectedGolfers.reduce((sum, g) => sum + g.salary, 0);
  const remainingSalary = tournament.salaryCap - totalSalary;
  const spotsLeft = tournament.rosterSize - selectedGolfers.length;
  const avgRemainingSalary =
    spotsLeft > 0 ? Math.floor(remainingSalary / spotsLeft) : 0;

  const uniqueForms = useMemo(() => {
    const forms = new Set(
      tournament.golfers.map((g) => g.form).filter(Boolean) as string[]
    );
    return ["All", ...Array.from(forms)];
  }, [tournament.golfers]);

  const filteredGolfers = useMemo(() => {
    let list = [...tournament.golfers];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }

    if (formFilter !== "All") {
      list = list.filter((g) => g.form === formFilter);
    }

    switch (sortBy) {
      case "salary-desc":
        list.sort((a, b) => b.salary - a.salary);
        break;
      case "salary-asc":
        list.sort((a, b) => a.salary - b.salary);
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return list;
  }, [tournament.golfers, search, sortBy, formFilter]);

  const canAddGolfer = (golfer: Golfer) => {
    const alreadySelected = selectedGolferIds.includes(golfer.id);
    if (alreadySelected) return true;
    if (selectedGolferIds.length >= tournament.rosterSize) return false;
    if (remainingSalary - golfer.salary < 0) return false;
    return true;
  };

  const toggleGolfer = (golfer: Golfer) => {
    const alreadySelected = selectedGolferIds.includes(golfer.id);

    if (alreadySelected) {
      setSelectedGolferIds((prev) => prev.filter((id) => id !== golfer.id));
      return;
    }

    if (!canAddGolfer(golfer)) return;

    setSelectedGolferIds((prev) => [...prev, golfer.id]);
  };

  const removeGolfer = (id: string) => {
    setSelectedGolferIds((prev) => prev.filter((golferId) => golferId !== id));
  };

  const clearLineup = () => {
    setSelectedGolferIds([]);
  };

  const isComplete = selectedGolferIds.length === tournament.rosterSize;
  const overCap = remainingSalary < 0;

  const handleTournamentChange = (key: string) => {
    setSelectedTournamentKey(key);
    setSelectedGolferIds([]);
    setSearch("");
    setFormFilter("All");
    setSortBy("salary-desc");
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.16),transparent_35%),radial-gradient(circle_at_right,rgba(59,130,246,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <TrophyIcon className="h-3.5 w-3.5" />
                Final Build Team
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Build Your Lineup
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
                Sleek, fast, and built for full tournament pools. Edit your golfer
                names and salaries at the top of this file for every new event.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Tournament
                </div>
                <div className="mt-1 text-base font-semibold">{tournament.name}</div>
                <div className="text-sm text-white/55">{tournament.subtitle}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Salary Cap
                </div>
                <div className="mt-1 text-base font-semibold">
                  {currency(tournament.salaryCap)}
                </div>
                <div className="text-sm text-white/55">
                  {tournament.rosterSize} roster spots
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Player Pool
                </div>
                <div className="mt-1 text-base font-semibold">
                  {tournament.golfers.length} golfers
                </div>
                <div className="text-sm text-white/55">Handles 60+ perfectly</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">
                    Tournament
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTournamentKey}
                      onChange={(e) => handleTournamentChange(e.target.value)}
                      className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/30 px-4 pr-10 text-sm text-white outline-none transition focus:border-emerald-400/50"
                    >
                      {tournamentKeys.map((key) => (
                        <option key={key} value={key} className="bg-neutral-900">
                          {TOURNAMENTS[key].name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">
                    Search Golfers
                  </label>
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by player name"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">
                    Sort
                  </label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/30 px-4 pr-10 text-sm text-white outline-none transition focus:border-emerald-400/50"
                    >
                      <option value="salary-desc" className="bg-neutral-900">
                        Salary: High to Low
                      </option>
                      <option value="salary-asc" className="bg-neutral-900">
                        Salary: Low to High
                      </option>
                      <option value="name-asc" className="bg-neutral-900">
                        Name: A to Z
                      </option>
                      <option value="name-desc" className="bg-neutral-900">
                        Name: Z to A
                      </option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">
                    Form Filter
                  </label>
                  <div className="relative">
                    <select
                      value={formFilter}
                      onChange={(e) => setFormFilter(e.target.value)}
                      className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/30 px-4 pr-10 text-sm text-white outline-none transition focus:border-emerald-400/50"
                    >
                      {uniqueForms.map((form) => (
                        <option key={form} value={form} className="bg-neutral-900">
                          {form}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-lg font-semibold">Player Pool</h2>
                  <p className="text-sm text-white/55">
                    {filteredGolfers.length} shown of {tournament.golfers.length} golfers
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
                  <SlidersHorizontalIcon className="h-3.5 w-3.5" />
                  Fast scroll layout for large fields
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                <div className="grid gap-3 p-4 sm:p-5">
                  {filteredGolfers.map((golfer) => {
                    const isSelected = selectedGolferIds.includes(golfer.id);
                    const disabled = !canAddGolfer(golfer) && !isSelected;

                    return (
                      <button
                        type="button"
                        key={golfer.id}
                        onClick={() => toggleGolfer(golfer)}
                        disabled={disabled}
                        className={classNames(
                          "group flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all",
                          isSelected
                            ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(74,222,128,0.15)]"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]",
                          disabled && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div
                            className={classNames(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                              isSelected
                                ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                                : "border-white/10 bg-white/5 text-white/70"
                            )}
                          >
                            {isSelected ? (
                              <CheckCircle2Icon className="h-5 w-5" />
                            ) : (
                              <UsersIcon className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold sm:text-base">
                              {golfer.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {golfer.form && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
                                  {golfer.form}
                                </span>
                              )}
                              {isSelected && (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
                                  Added
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold sm:text-base">
                              {currency(golfer.salary)}
                            </div>
                            <div className="text-xs text-white/45">salary</div>
                          </div>

                          <div
                            className={classNames(
                              "rounded-xl border px-3 py-2 text-xs font-medium",
                              isSelected
                                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                : "border-white/10 bg-white/5 text-white/70"
                            )}
                          >
                            {isSelected ? "Remove" : "Add"}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredGolfers.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
                      <div className="text-base font-medium text-white/80">
                        No golfers found
                      </div>
                      <div className="mt-2 text-sm text-white/50">
                        Try changing your search or filter.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Lineup Summary</h2>
                    <p className="text-sm text-white/55">
                      Track your cap and roster instantly
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearLineup}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<UsersIcon className="h-4 w-4" />}
                    label="Spots Used"
                    value={`${selectedGolfers.length}/${tournament.rosterSize}`}
                  />
                  <StatCard
                    icon={<DollarSignIcon className="h-4 w-4" />}
                    label="Remaining"
                    value={currency(remainingSalary)}
                    danger={remainingSalary < 0}
                  />
                  <StatCard
                    icon={<DollarSignIcon className="h-4 w-4" />}
                    label="Spent"
                    value={currency(totalSalary)}
                  />
                  <StatCard
                    icon={<TrophyIcon className="h-4 w-4" />}
                    label="Avg Per Spot"
                    value={spotsLeft > 0 ? currency(avgRemainingSalary) : "$0"}
                  />
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                    <span>Salary progress</span>
                    <span>
                      {currency(totalSalary)} / {currency(tournament.salaryCap)}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={classNames(
                        "h-full rounded-full transition-all",
                        overCap ? "bg-red-500" : "bg-emerald-400"
                      )}
                      style={{
                        width: `${Math.min(
                          (totalSalary / tournament.salaryCap) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div
                  className={classNames(
                    "mt-4 rounded-2xl border px-4 py-3 text-sm",
                    isComplete && !overCap
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-black/20 text-white/65"
                  )}
                >
                  {isComplete && !overCap
                    ? "Your lineup is complete and under the salary cap."
                    : `Select ${Math.max(
                        tournament.rosterSize - selectedGolfers.length,
                        0
                      )} more golfer${
                        tournament.rosterSize - selectedGolfers.length === 1 ? "" : "s"
                      } to finish your lineup.`}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Selected Golfers</h2>
                  <p className="text-sm text-white/55">
                    Your final team for this event
                  </p>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: tournament.rosterSize }).map((_, index) => {
                    const golfer = selectedGolfers[index];

                    if (!golfer) {
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-2xl border border-dashed border-white/10 bg-black/20 p-4"
                        >
                          <div>
                            <div className="text-sm font-medium text-white/70">
                              Spot #{index + 1}
                            </div>
                            <div className="text-xs text-white/40">
                              Empty lineup slot
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40">
                            Open
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={golfer.id}
                        className="flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{golfer.name}</div>
                          <div className="mt-1 text-xs text-white/55">
                            Spot #{index + 1}
                            {golfer.form ? ` • ${golfer.form}` : ""}
                          </div>
                        </div>

                        <div className="ml-4 flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold">
                              {currency(golfer.salary)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeGolfer(golfer.id)}
                            className="rounded-xl border border-red-400/20 bg-red-400/10 p-2 text-red-300 transition hover:bg-red-400/15"
                            aria-label={`Remove ${golfer.name}`}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <h3 className="text-base font-semibold">How to update each tournament</h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                  <p>
                    1. Go to the <span className="text-white">TOURNAMENTS</span> object at the
                    top of this file.
                  </p>
                  <p>
                    2. Change the tournament name, roster size, salary cap, and golfer list.
                  </p>
                  <p>
                    3. Each golfer only needs:
                    <span className="ml-1 text-white">id, name, salary</span>.
                  </p>
                  <p>
                    4. Duplicate a tournament block whenever you want a new event.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-white/45">{icon}</div>
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className={classNames(
          "mt-1 text-lg font-semibold",
          danger ? "text-red-400" : "text-white"
        )}
      >
        {value}
      </div>
    </div>
  );
}
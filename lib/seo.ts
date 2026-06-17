import type { Metadata } from "next";

export const siteName = "Poolr";
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://poolrgolf.com"
).replace(/\/$/, "");

export const homeTitle = "Poolr | Golf Pool App for PGA Tournament Pools";
export const homeDescription =
  "Create and run premium golf pools for PGA tournaments with custom rules, hidden picks, live leaderboards, salary cap formats, and free invites for friends.";
export const poolrIconPath = "/poolr-icon.png";
export const poolrOgImagePath = "/poolr-og.png";
export const appleTouchIconPath = "/apple-touch-icon.png";
export const poolrOgImage = {
  url: poolrOgImagePath,
  width: 1200,
  height: 630,
  alt: "Poolr golf pool app",
};

export type FAQ = {
  question: string;
  answer: string;
};

export type LandingPage = {
  key: string;
  path: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  intro: string;
  bullets: string[];
  sections: Array<{
    title: string;
    text: string;
  }>;
  featureTitle: string;
  features: Array<{
    title: string;
    text: string;
  }>;
  faqs: FAQ[];
  related: Array<{
    href: string;
    label: string;
  }>;
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [poolrOgImage],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [poolrOgImagePath],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function landingPageMetadata(page: LandingPage): Metadata {
  return pageMetadata({
    title: page.metaTitle,
    description: page.description,
    path: page.path,
  });
}

export const publicMarketingPaths = [
  "/",
  "/golf-pools",
  "/pga-golf-pool",
  "/fantasy-golf-pool",
  "/masters-golf-pool",
  "/us-open-golf-pool",
  "/salary-cap-golf-pool",
  "/tiered-golf-pool",
  "/pricing",
  "/how",
  "/live",
  "/privacy",
  "/terms",
];

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  description:
    "Poolr is a premium golf tournament pool platform for creating, joining, and running private golf pools with friends.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@poolrgolf.com",
  },
};

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description: homeDescription,
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "First premium Poolr golf pool is free.",
    },
    {
      "@type": "Offer",
      price: "9.99",
      priceCurrency: "USD",
      description: "Additional single premium golf pools are $9.99.",
    },
  ],
  featureList: [
    "Golf tournament pool creation",
    "Private invite links and codes",
    "Salary cap and tiered golfer formats",
    "Hidden picks before tournament lock",
    "Live leaderboards",
    "Custom scoring rules",
  ],
};

export function faqJsonLd(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const coreRelatedLinks = [
  { href: "/golf-pools", label: "Golf pools" },
  { href: "/pga-golf-pool", label: "PGA golf pool" },
  { href: "/fantasy-golf-pool", label: "Fantasy golf pool" },
  { href: "/salary-cap-golf-pool", label: "Salary cap format" },
  { href: "/tiered-golf-pool", label: "Tiered golfer format" },
];

export const seoLandingPages: Record<string, LandingPage> = {
  "golf-pools": {
    key: "golf-pools",
    path: "/golf-pools",
    eyebrow: "Golf pools",
    title: "Golf pools that feel organized from the first invite",
    metaTitle: "Golf Pools | Create a Premium Golf Pool with Poolr",
    description:
      "Create golf pools with custom rules, invite links, hidden picks, live leaderboards, salary cap formats, and tiered golfer formats in Poolr.",
    intro:
      "Poolr gives commissioners a cleaner way to run golf pools without spreadsheet cleanup, scattered rules, or group chat confusion.",
    bullets: [
      "Create a golf pool in minutes",
      "Invite friends with a private link or code",
      "Keep picks hidden before lock",
      "Track the leaderboard live",
    ],
    sections: [
      {
        title: "Built for real tournament weekends",
        text: "Set up the pool before the tournament, let everyone build teams on their phone, then follow standings when the event goes live.",
      },
      {
        title: "Creator pays, everyone else joins free",
        text: "Poolr keeps the group flow simple. The commissioner unlocks the premium pool, then friends can join, build teams, and follow along without a participant fee from Poolr.",
      },
    ],
    featureTitle: "What a Poolr golf pool includes",
    features: [
      {
        title: "Custom rules",
        text: "Choose roster size, counted golfers, bonus scoring, and the format that fits your group.",
      },
      {
        title: "Private invites",
        text: "Share one clean invite link or code for friends, offices, fraternities, golf groups, and tournament trips.",
      },
      {
        title: "Live standings",
        text: "Once the tournament starts, teams and leaderboard movement become easy to follow from any phone.",
      },
    ],
    faqs: [
      {
        question: "What is a golf pool?",
        answer:
          "A golf pool is a private competition where people pick golfers for a tournament and compare results as the event plays out.",
      },
      {
        question: "Does Poolr handle gambling or winnings?",
        answer:
          "No. Poolr is golf pool software. It does not process wagers, winnings, bets, or prize pools.",
      },
      {
        question: "Can people join from their phones?",
        answer:
          "Yes. Poolr is built around mobile invites, mobile team building, and mobile leaderboard checks.",
      },
    ],
    related: coreRelatedLinks,
  },
  "pga-golf-pool": {
    key: "pga-golf-pool",
    path: "/pga-golf-pool",
    eyebrow: "PGA golf pool",
    title: "Run a PGA golf pool without the spreadsheet mess",
    metaTitle: "PGA Golf Pool App | Run PGA Tournament Pools with Poolr",
    description:
      "Run PGA golf pools with custom rules, salary cap or tiered picks, hidden teams before lock, and live tournament leaderboards in Poolr.",
    intro:
      "Poolr is designed for PGA tournament pools where commissioners want a premium setup, simple invites, and a live board people actually check.",
    bullets: [
      "Pick a PGA-style tournament",
      "Set salary cap or tiered rules",
      "Invite the group before lock",
      "Follow standings as scores move",
    ],
    sections: [
      {
        title: "Made for majors and regular events",
        text: "Use Poolr for major weekends, office pools, golf trips, or a one-off tournament your group wants to make more competitive.",
      },
      {
        title: "Clear rules before anyone picks",
        text: "Poolr keeps roster size, counted scores, bonus scoring, team visibility, and invite access organized in one place.",
      },
    ],
    featureTitle: "Why PGA pool commissioners use Poolr",
    features: [
      {
        title: "Fast setup",
        text: "Create the pool, pick the tournament, choose rules, and move straight into team building.",
      },
      {
        title: "Hidden picks",
        text: "Teams stay hidden before lock so the pool feels fair and competitive.",
      },
      {
        title: "Tournament energy",
        text: "The live leaderboard gives the group a reason to keep checking back through Sunday.",
      },
    ],
    faqs: [
      {
        question: "Can I run a PGA major pool in Poolr?",
        answer:
          "Yes. Poolr is built for PGA-style tournament pools, including major weekends and other events your group wants to play.",
      },
      {
        question: "Do participants pay Poolr to join?",
        answer:
          "No. The creator unlocks the pool. Friends join free through the invite link or code.",
      },
      {
        question: "Can I choose different formats?",
        answer:
          "Yes. Poolr supports salary cap and tiered golfer formats with custom roster and scoring settings.",
      },
    ],
    related: coreRelatedLinks,
  },
  "fantasy-golf-pool": {
    key: "fantasy-golf-pool",
    path: "/fantasy-golf-pool",
    eyebrow: "Fantasy golf pool",
    title: "A cleaner fantasy golf pool for friends and groups",
    metaTitle: "Fantasy Golf Pool App | Premium Fantasy Golf Pools | Poolr",
    description:
      "Build fantasy golf pools with salary cap or tiered rosters, hidden picks, custom scoring, private invites, and live leaderboards in Poolr.",
    intro:
      "Poolr brings the structure of fantasy golf into a simple private pool experience for friends, offices, golf groups, and tournament weekends.",
    bullets: [
      "Build teams before lock",
      "Use salary cap or tiered rosters",
      "Hide picks until the tournament starts",
      "Watch standings update live",
    ],
    sections: [
      {
        title: "Fantasy golf without a heavy league setup",
        text: "Poolr is focused on tournament pools, so your group can create one clean competition around a specific event.",
      },
      {
        title: "Strategy without confusion",
        text: "Salary cap pools add budget decisions, while tiered pools keep the format simple for casual players.",
      },
    ],
    featureTitle: "A better fantasy golf pool flow",
    features: [
      {
        title: "Team building",
        text: "Members pick golfers from the tournament field and can edit before lock.",
      },
      {
        title: "Mobile-first joins",
        text: "Invite links are built for group chats so people can join and build from their phones.",
      },
      {
        title: "Live leaderboard",
        text: "Keep everyone engaged while the tournament plays out.",
      },
    ],
    faqs: [
      {
        question: "Is Poolr a fantasy golf app?",
        answer:
          "Poolr is a golf tournament pool platform with fantasy-style team building, scoring, and live leaderboards.",
      },
      {
        question: "Can casual golf fans use it?",
        answer:
          "Yes. Tiered formats are simple for casual groups, while salary cap formats add strategy for more serious players.",
      },
      {
        question: "Are picks private before lock?",
        answer:
          "Yes. Poolr supports hidden picks before tournament lock.",
      },
    ],
    related: coreRelatedLinks,
  },
  "masters-golf-pool": {
    key: "masters-golf-pool",
    path: "/masters-golf-pool",
    eyebrow: "Masters golf pool",
    title: "Make Masters weekend easier to run",
    metaTitle: "Masters Golf Pool App | Run a Masters Pool with Poolr",
    description:
      "Create a Masters golf pool with custom rules, hidden picks, private invites, salary cap or tiered formats, and a live leaderboard in Poolr.",
    intro:
      "Masters weekend is when casual and serious golf fans both want in. Poolr helps commissioners run a polished pool without managing everything by hand.",
    bullets: [
      "Create a Masters-style tournament pool",
      "Invite friends, offices, fraternities, or golf groups",
      "Keep picks hidden before the first tee time",
      "Follow a live leaderboard all weekend",
    ],
    sections: [
      {
        title: "Built for the biggest golf weekends",
        text: "Use Poolr when your group wants the tournament to feel more competitive, organized, and easy to follow.",
      },
      {
        title: "Simple enough for one weekend",
        text: "Create the pool, share the invite, and let everyone build teams before lock. Poolr handles the structure around the competition.",
      },
    ],
    featureTitle: "What makes it work for Masters pools",
    features: [
      {
        title: "Premium invite flow",
        text: "Send one link or code to the group chat and keep entry simple.",
      },
      {
        title: "Flexible formats",
        text: "Run a salary cap pool for strategy or a tiered pool for a simpler group format.",
      },
      {
        title: "Weekend leaderboard",
        text: "Give everyone a clean place to check standings as the tournament moves.",
      },
    ],
    faqs: [
      {
        question: "Can Poolr be used for a Masters office pool?",
        answer:
          "Yes. Poolr works well for offices, friend groups, golf groups, fraternities, and tournament weekend pools.",
      },
      {
        question: "Do I have to charge an entry fee?",
        answer:
          "No. Poolr supports free group pools and optional buy-in tracking. Poolr does not handle wagers or prize money.",
      },
      {
        question: "Is the first Poolr pool free?",
        answer:
          "Yes. Each user gets their first premium Poolr pool free.",
      },
    ],
    related: [
      { href: "/pga-golf-pool", label: "PGA golf pool" },
      { href: "/us-open-golf-pool", label: "US Open golf pool" },
      { href: "/salary-cap-golf-pool", label: "Salary cap golf pool" },
      { href: "/tiered-golf-pool", label: "Tiered golf pool" },
    ],
  },
  "us-open-golf-pool": {
    key: "us-open-golf-pool",
    path: "/us-open-golf-pool",
    eyebrow: "US Open golf pool",
    title: "Run a sharp US Open golf pool on Poolr",
    metaTitle: "US Open Golf Pool App | Create a US Open Pool with Poolr",
    description:
      "Create a US Open golf pool with private invites, hidden picks, custom rules, salary cap or tiered formats, and live leaderboards in Poolr.",
    intro:
      "Poolr helps commissioners make US Open week feel more organized, competitive, and easy to follow from the first invite to the final leaderboard.",
    bullets: [
      "Set custom US Open pool rules",
      "Let the creator unlock the premium pool",
      "Friends join free by link or code",
      "Track standings live through the weekend",
    ],
    sections: [
      {
        title: "A premium flow for a major week",
        text: "US Open pools often bring in casual players and serious golf fans. Poolr keeps the experience clean for both.",
      },
      {
        title: "Rules your group can understand",
        text: "Choose the roster format, counted golfers, salary cap or tiers, and scoring bonuses before anyone submits a team.",
      },
    ],
    featureTitle: "US Open pool essentials",
    features: [
      {
        title: "Mobile invites",
        text: "Share the pool in a group chat and get people into the right flow quickly.",
      },
      {
        title: "Hidden teams",
        text: "Keep picks private before lock so nobody copies a lineup.",
      },
      {
        title: "Live competition",
        text: "Standings and golfer movement stay easy to follow as scores change.",
      },
    ],
    faqs: [
      {
        question: "Can I use Poolr for a US Open golf pool?",
        answer:
          "Yes. Poolr is built for major tournament pools, including US Open-style golf pools.",
      },
      {
        question: "Can participants join free?",
        answer:
          "Yes. The pool creator pays or uses the free first pool. Participants join free on Poolr.",
      },
      {
        question: "Can I use salary cap rules?",
        answer:
          "Yes. Poolr supports salary cap golf pools and tiered golfer pools.",
      },
    ],
    related: [
      { href: "/masters-golf-pool", label: "Masters golf pool" },
      { href: "/pga-golf-pool", label: "PGA golf pool" },
      { href: "/fantasy-golf-pool", label: "Fantasy golf pool" },
      { href: "/salary-cap-golf-pool", label: "Salary cap format" },
    ],
  },
  "salary-cap-golf-pool": {
    key: "salary-cap-golf-pool",
    path: "/salary-cap-golf-pool",
    eyebrow: "Salary cap golf pool",
    title: "Add strategy with a salary cap golf pool",
    metaTitle: "Salary Cap Golf Pool App | Build Salary Cap Pools | Poolr",
    description:
      "Create salary cap golf pools where users build rosters with a team budget, hidden picks, custom scoring, and live leaderboards in Poolr.",
    intro:
      "Salary cap pools make every roster decision matter. Poolr gives commissioners a clean way to run that format without manually tracking budgets and picks.",
    bullets: [
      "Set a team budget",
      "Choose roster size and counted scores",
      "Let users build before lock",
      "Score the pool live during the tournament",
    ],
    sections: [
      {
        title: "More strategy for serious groups",
        text: "A salary cap format rewards people who find value in the field instead of only picking favorites.",
      },
      {
        title: "Simple enough to join from a phone",
        text: "Poolr keeps the salary cap visible while users build teams, so the format stays usable on mobile.",
      },
    ],
    featureTitle: "Salary cap pool features",
    features: [
      {
        title: "Budget tracking",
        text: "Users can see salary used and salary left while building a team.",
      },
      {
        title: "Custom roster size",
        text: "Set how many golfers each team picks and how many scores count.",
      },
      {
        title: "Live scoring",
        text: "The leaderboard compares teams once the tournament is live.",
      },
    ],
    faqs: [
      {
        question: "What is a salary cap golf pool?",
        answer:
          "It is a format where each team builds a roster under a set budget, adding strategy to golfer selection.",
      },
      {
        question: "Does Poolr support salary cap team building?",
        answer:
          "Yes. Poolr includes a salary cap format with roster controls and live leaderboard scoring.",
      },
      {
        question: "Can I run a salary cap pool for friends?",
        answer:
          "Yes. Poolr is designed for private groups using invite links or codes.",
      },
    ],
    related: coreRelatedLinks,
  },
  "tiered-golf-pool": {
    key: "tiered-golf-pool",
    path: "/tiered-golf-pool",
    eyebrow: "Tiered golf pool",
    title: "Keep picks simple with a tiered golf pool",
    metaTitle: "Tiered Golf Pool App | Run Tiered Golfer Pools | Poolr",
    description:
      "Create tiered golf pools where users pick golfers by tier, submit hidden teams before lock, and follow a live leaderboard in Poolr.",
    intro:
      "Tiered pools are easy for groups to understand. Poolr keeps the rules clear while still making the experience feel premium and competitive.",
    bullets: [
      "Group golfers into tiers",
      "Pick one golfer from each tier",
      "Keep teams hidden before lock",
      "Track standings when the tournament starts",
    ],
    sections: [
      {
        title: "A friendly format for mixed groups",
        text: "Tiered pools work well when some players know golf deeply and others just want a clean, fair way to join.",
      },
      {
        title: "Less budget math, still strategic",
        text: "Instead of managing a salary cap, players make one choice in each tier and compare teams when the event begins.",
      },
    ],
    featureTitle: "Tiered golf pool features",
    features: [
      {
        title: "Clear tier rules",
        text: "Set a tiered format and keep roster construction easy to understand.",
      },
      {
        title: "Mobile team building",
        text: "Users can build and edit teams before lock from their phones.",
      },
      {
        title: "Hidden picks",
        text: "Teams can stay private until the tournament starts.",
      },
    ],
    faqs: [
      {
        question: "What is a tiered golf pool?",
        answer:
          "A tiered golf pool groups golfers into tiers and usually asks each user to pick one golfer from each tier.",
      },
      {
        question: "Is tiered simpler than salary cap?",
        answer:
          "Usually yes. Tiered formats are easier for casual players, while salary cap formats add more budget strategy.",
      },
      {
        question: "Can Poolr run tiered golfer pools?",
        answer:
          "Yes. Poolr supports tiered golfer formats alongside salary cap formats.",
      },
    ],
    related: coreRelatedLinks,
  },
};

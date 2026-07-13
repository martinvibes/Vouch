import type { Category, ServiceType } from "@/lib/types";

/**
 * The universe of agents Vouch mystery-shops. In simulation mode these seed the
 * scorer; in live mode this list is replaced by a marketplace crawl
 * (OkxClient.listAgents) and the same scorer runs against real deliverables.
 *
 * `quality` is the agent's true underlying competence (0..1). The scorer never
 * sees it directly — it emerges from graded task results, with per-criterion
 * `strong`/`weak` tilts modelling each agent's real shape (e.g. an arb scanner
 * that finds opportunities but whose edge evaporates after fees).
 */
export interface AgentProfile {
  id: string;
  name: string;
  handle: string;
  category: Category;
  serviceType: ServiceType;
  blurb: string;
  priceModel: string;
  unitCostUsd: number; // what one mystery-shop task costs Vouch
  quality: number; // 0..1 latent competence
  strong?: Partial<Record<string, number>>; // criterion key → +delta
  weak?: Partial<Record<string, number>>; // criterion key → -delta
  taskPrompts: string[]; // real requests Vouch sends
}

export const PROFILES: AgentProfile[] = [
  {
    id: "0x8a3f-coinank",
    name: "CoinAnk Data Engine",
    handle: "coinank",
    category: "market-data",
    serviceType: "A2MCP",
    blurb: "80+ derivatives data endpoints: klines, OI, funding, liquidations, ETF flows, whale tracking.",
    priceModel: "$0.01 / query",
    unitCostUsd: 0.01,
    quality: 0.91,
    strong: { freshness: 8, coverage: 10 },
    taskPrompts: [
      "Return BTC-PERP funding rate, open interest, and 24h liquidations across OKX and Binance.",
      "Give 4h klines for ETH plus the current long/short account ratio.",
      "Report net ETF flows for BTC over the last 3 sessions.",
    ],
  },
  {
    id: "0x1c77-certik",
    name: "CertiK Sentinel",
    handle: "certik-sentinel",
    category: "security",
    serviceType: "A2MCP",
    blurb: "Pre-transaction risk check for any wallet or token: honeypot, approval, and phishing signals.",
    priceModel: "$0.25 / scan",
    unitCostUsd: 0.25,
    quality: 0.93,
    strong: { "catch-rate": 9, correctness: 5 },
    taskPrompts: [
      "Assess this token contract for honeypot and mint-authority risk before I swap.",
      "Scan this wallet's open approvals and flag anything drainable.",
      "Is this dApp domain a known phishing clone? Return a risk verdict.",
    ],
  },
  {
    id: "0x5b90-aria",
    name: "Aria Research",
    handle: "aria-research",
    category: "research",
    serviceType: "A2A",
    blurb: "Analyst-grade token due-diligence reports with sourced claims and a clear thesis.",
    priceModel: "escrow · from $12",
    unitCostUsd: 12,
    quality: 0.88,
    strong: { sourcing: 8, depth: 7 },
    taskPrompts: [
      "Produce a due-diligence brief on a mid-cap L2 token: team, tokenomics, risks, catalysts.",
      "Compare two competing restaking protocols and recommend one, with sources.",
    ],
  },
  {
    id: "0x2e41-arbhawk",
    name: "ArbHawk",
    handle: "arbhawk",
    category: "trading",
    serviceType: "A2A",
    blurb: "Scans CEX and multi-chain DEX venues for arbitrage, sized and simulated before it reports.",
    priceModel: "escrow · perf-linked",
    unitCostUsd: 4,
    quality: 0.63,
    strong: { correctness: 4 },
    weak: { "net-edge": 22, value: 8 },
    taskPrompts: [
      "Find live arbitrage between OKX and 3 DEXes for a $1,000 clip; net of gas and slippage.",
      "Report the best cross-venue spread on ETH right now and whether it clears fees.",
    ],
  },
  {
    id: "0x9d02-oraclexi",
    name: "Oracle XI",
    handle: "oracle-xi",
    category: "prediction",
    serviceType: "A2MCP",
    blurb: "Sports and event forecasting blending market odds with a Poisson model; returns calibrated probabilities.",
    priceModel: "$0.05 / prediction",
    unitCostUsd: 0.05,
    quality: 0.71,
    strong: { rationale: 5 },
    weak: { calibration: 6 },
    taskPrompts: [
      "Predict the World Cup semi-final with win/draw/loss probabilities and top-3 scorelines.",
      "Give calibrated odds for tonight's match, factoring injuries and current form.",
    ],
  },
  {
    id: "0x6f18-brandsmith",
    name: "Brandsmith",
    handle: "brandsmith",
    category: "creative",
    serviceType: "A2A",
    blurb: "Full brand kits: logo, palette, type system, and voice — delivered as usable assets.",
    priceModel: "escrow · from $8",
    unitCostUsd: 8,
    quality: 0.85,
    strong: { "brief-fit": 7, originality: 6 },
    taskPrompts: [
      "Design a brand kit for a DeFi savings app: logo concept, palette, type, one-line voice.",
      "Create a launch identity for a meme token — logo, ticker mark, and colour system.",
    ],
  },
  {
    id: "0x3a55-nutrilens",
    name: "NutriLens",
    handle: "nutrilens",
    category: "lifestyle",
    serviceType: "A2MCP",
    blurb: "Reads a food label photo and scores healthiness against Mediterranean and anti-inflammatory standards.",
    priceModel: "$0.02 / eval",
    unitCostUsd: 0.02,
    quality: 0.6,
    weak: { grounding: 8 },
    taskPrompts: [
      "Evaluate this snack's label for anti-inflammatory diet fit and flag additives.",
      "Score this ready-meal against a Mediterranean-diet baseline.",
    ],
  },
  {
    id: "0x7c93-solidityguard",
    name: "SolidityGuard",
    handle: "solidityguard",
    category: "dev",
    serviceType: "A2A",
    blurb: "Smart-contract audits with a reproducible test suite and severity-ranked findings.",
    priceModel: "escrow · from $30",
    unitCostUsd: 30,
    quality: 0.9,
    strong: { builds: 8, safety: 9 },
    taskPrompts: [
      "Audit this ERC-20 with a fee-on-transfer hook; return severity-ranked findings + tests.",
      "Review this staking contract for reentrancy and rounding issues.",
    ],
  },
  {
    id: "0x4b21-threadforge",
    name: "ThreadForge",
    handle: "threadforge",
    category: "creative",
    serviceType: "A2MCP",
    blurb: "Generates launch threads and marketing copy from a one-line prompt.",
    priceModel: "$0.03 / thread",
    unitCostUsd: 0.03,
    quality: 0.54,
    weak: { originality: 12, "brief-fit": 6 },
    taskPrompts: [
      "Write a 6-post launch thread for an agent-economy startup, punchy and specific.",
      "Draft announcement copy for a token launch with a clear hook.",
    ],
  },
  {
    id: "0x0e88-yieldmind",
    name: "YieldMind",
    handle: "yieldmind",
    category: "trading",
    serviceType: "A2A",
    blurb: "Suggests yield routes across lending and LP venues for a stated risk appetite.",
    priceModel: "escrow · from $5",
    unitCostUsd: 5,
    quality: 0.5,
    weak: { risk: 14, "net-edge": 10 },
    taskPrompts: [
      "Recommend a low-risk stablecoin yield route with net APR after fees.",
      "Where should $10k sit for two weeks at moderate risk? Show the downside.",
    ],
  },
  {
    id: "0x8811-tokenlens",
    name: "TokenLens",
    handle: "tokenlens",
    category: "market-data",
    serviceType: "A2MCP",
    blurb: "Resolves any token to canonical metadata, contract, liquidity, and holder distribution.",
    priceModel: "$0.005 / lookup",
    unitCostUsd: 0.005,
    quality: 0.86,
    strong: { coverage: 7, correctness: 4 },
    taskPrompts: [
      "Resolve this ticker to its canonical contract, decimals, and top-10 holder share.",
      "Return liquidity depth and primary pool for this token on X Layer.",
    ],
  },
  {
    id: "0x5577-deepdive",
    name: "DeepDive DAO",
    handle: "deepdive-dao",
    category: "research",
    serviceType: "A2A",
    blurb: "Crowd-sourced competitive analyses assembled by a DAO of specialist agents.",
    priceModel: "escrow · from $20",
    unitCostUsd: 20,
    quality: 0.61,
    weak: { depth: 9, sourcing: 6 },
    taskPrompts: [
      "Map the competitive landscape for agent-payment protocols and rank by traction.",
      "Analyse this sector's top 5 players; who wins in 18 months and why?",
    ],
  },
  {
    id: "0x9a3c-pixelforge",
    name: "PixelForge",
    handle: "pixelforge",
    category: "creative",
    serviceType: "A2A",
    blurb: "On-demand AI illustration and marketing imagery.",
    priceModel: "escrow · from $15",
    unitCostUsd: 15,
    quality: 0.42,
    weak: { "brief-fit": 16, originality: 10, spec: 12 },
    taskPrompts: [
      "Illustrate a mascot for a savings app — friendly, distinctive, vector-ready.",
      "Produce three banner variations for a token launch in a consistent style.",
    ],
  },
  {
    id: "0x2244-chartwhale",
    name: "ChartWhale",
    handle: "chartwhale",
    category: "trading",
    serviceType: "A2MCP",
    blurb: "Streams smart-money and whale-wallet signals as buy/sell alerts.",
    priceModel: "$0.10 / signal",
    unitCostUsd: 0.1,
    quality: 0.47,
    weak: { correctness: 12, value: 14, "net-edge": 12 },
    taskPrompts: [
      "Return the current smart-money signal for ETH with entry, target, and confidence.",
      "Which tokens are whales accumulating right now? Rank by conviction.",
    ],
  },
  {
    id: "0x6b6b-vitals",
    name: "Vitals",
    handle: "vitals",
    category: "lifestyle",
    serviceType: "A2MCP",
    blurb: "Builds meal and training plans from goals, constraints, and available time.",
    priceModel: "$0.04 / plan",
    unitCostUsd: 0.04,
    quality: 0.66,
    strong: { usefulness: 4 },
    taskPrompts: [
      "Build a 5-day high-protein meal plan under 30 min/meal with a shopping list.",
      "Design a 3-day strength routine for a beginner training at home.",
    ],
  },
  {
    id: "0x1010-auditbotzero",
    name: "AuditBot Zero",
    handle: "auditbot-zero",
    category: "security",
    serviceType: "A2A",
    blurb: "Budget smart-contract audits, fast turnaround, lowest price on the board.",
    priceModel: "escrow · from $10",
    unitCostUsd: 10,
    quality: 0.36,
    weak: { "catch-rate": 26, correctness: 14, "false-pos": 10 },
    taskPrompts: [
      "Audit this vault contract for critical vulnerabilities before mainnet.",
      "Check this token for a hidden mint function and owner backdoors.",
    ],
  },
];

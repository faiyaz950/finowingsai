export type AssetType = "stock" | "crypto" | "mf";

export interface Holding {
  id: string;
  type: AssetType;
  symbol: string;      // "TCS", "BTC", "Parag Parikh Flexi Cap"
  name: string;        // display name
  quantity: number;    // shares / units / coins
  buyPrice: number;    // ₹ for stock/MF, $ for crypto
  currency: "INR" | "USD";
  addedAt: string;     // ISO date string
}

export interface PricedHolding extends Holding {
  currentPrice: number;
  currentValue: number;   // quantity × currentPrice (in native currency)
  currentValueINR: number;
  investedINR: number;    // quantity × buyPrice (converted to INR)
  pnlINR: number;
  pnlPct: number;
  change24h: number;
  priceLoading: boolean;
  priceError: boolean;
}

export interface PortfolioSummary {
  totalInvestedINR: number;
  totalCurrentINR: number;
  totalPnlINR: number;
  totalPnlPct: number;
  stocksValueINR: number;
  cryptoValueINR: number;
  mfValueINR: number;
}

// ── CoinGecko symbol map ──────────────────────────────────────────────────

export const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  UNI: "uniswap",
  ATOM: "cosmos",
};

export const POPULAR_CRYPTOS = Object.keys(CRYPTO_ID_MAP);

export const POPULAR_STOCKS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
  "HINDUNILVR", "SBIN", "WIPRO", "BHARTIARTL", "ITC",
  "BAJFINANCE", "ADANIENT", "TATAMOTORS", "MARUTI", "AXISBANK",
  "KOTAKBANK", "TITAN", "SUNPHARMA", "ULTRACEMCO", "NESTLEIND",
];

// ── localStorage ──────────────────────────────────────────────────────────

const PORTFOLIO_KEY = "finowingsai_portfolio";
const PORTFOLIO_AI_CONTEXT_KEY = "finowingsai_portfolio_ai_context";
const PORTFOLIO_SOURCE_KEY = "finowingsai_portfolio_source";

export interface PortfolioSourceMeta {
  fileName?: string;
  format?: string;
  importedAt: string;
}

export function savePortfolioAIContext(summary: string, meta?: PortfolioSourceMeta): void {
  try {
    localStorage.setItem(PORTFOLIO_AI_CONTEXT_KEY, summary);
    if (meta) {
      localStorage.setItem(PORTFOLIO_SOURCE_KEY, JSON.stringify(meta));
    }
  } catch {
    // ignore
  }
}

export function getPortfolioAIContext(): string | null {
  try {
    return localStorage.getItem(PORTFOLIO_AI_CONTEXT_KEY);
  } catch {
    return null;
  }
}

export function getPortfolioSourceMeta(): PortfolioSourceMeta | null {
  try {
    const raw = localStorage.getItem(PORTFOLIO_SOURCE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPortfolioAIContext(): void {
  try {
    localStorage.removeItem(PORTFOLIO_AI_CONTEXT_KEY);
    localStorage.removeItem(PORTFOLIO_SOURCE_KEY);
  } catch {
    // ignore
  }
}

/** Build compact context for AI chat from holdings + optional raw document text */
export function buildPortfolioAIContext(
  holdings: PricedHolding[],
  usdInr: number,
  rawDocumentText?: string
): string {
  const structured = buildPortfolioPrompt(holdings, usdInr);
  if (!rawDocumentText?.trim()) return structured;

  return (
    structured +
    "\n\n--- Uploaded document (extra rows / notes) ---\n" +
    rawDocumentText.slice(0, 8000)
  );
}

export function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(holdings));
  } catch {
    // ignore
  }
}

export function addHolding(h: Omit<Holding, "id" | "addedAt">): Holding {
  const holding: Holding = {
    ...h,
    id: Math.random().toString(36).slice(2, 10),
    addedAt: new Date().toISOString(),
  };
  const existing = loadHoldings();
  saveHoldings([holding, ...existing]);
  return holding;
}

export function removeHolding(id: string): void {
  saveHoldings(loadHoldings().filter((h) => h.id !== id));
}

export function mergeHoldings(
  incoming: Omit<Holding, "id" | "addedAt">[]
): Holding[] {
  const existing = loadHoldings();
  const merged = [...existing];

  for (const h of incoming) {
    const idx = merged.findIndex(
      (e) => e.symbol === h.symbol && e.type === h.type
    );
    if (idx >= 0) {
      const prev = merged[idx];
      const totalQty = prev.quantity + h.quantity;
      const avgPrice =
        totalQty > 0
          ? (prev.quantity * prev.buyPrice + h.quantity * h.buyPrice) / totalQty
          : h.buyPrice;
      merged[idx] = { ...prev, quantity: totalQty, buyPrice: avgPrice };
    } else {
      merged.push({
        ...h,
        id: Math.random().toString(36).slice(2, 10),
        addedAt: new Date().toISOString(),
      });
    }
  }

  saveHoldings(merged);
  return merged;
}

export function replaceHoldings(
  incoming: Omit<Holding, "id" | "addedAt">[]
): Holding[] {
  const fresh: Holding[] = incoming.map((h) => ({
    ...h,
    id: Math.random().toString(36).slice(2, 10),
    addedAt: new Date().toISOString(),
  }));
  saveHoldings(fresh);
  return fresh;
}

export function clearAllHoldings(): void {
  saveHoldings([]);
  clearPortfolioAIContext();
  clearConnectedBroker();
}

/** Keep AI context in sync after holdings or prices change */
export function syncPortfolioAIContext(
  holdings: PricedHolding[],
  usdInr: number,
  preserveMeta = true
): void {
  if (!holdings.length) return;
  const ctx = buildPortfolioAIContext(holdings, usdInr);
  const meta = preserveMeta ? getPortfolioSourceMeta() : null;
  savePortfolioAIContext(
    ctx,
    meta ?? { importedAt: new Date().toISOString(), format: "holdings" }
  );
}

const BROKER_KEY = "finowingsai_connected_broker";

export interface ConnectedBroker {
  id: string;
  name: string;
  connectedAt: string;
}

export function saveConnectedBroker(broker: ConnectedBroker): void {
  try {
    localStorage.setItem(BROKER_KEY, JSON.stringify(broker));
  } catch {
    // ignore
  }
}

export function loadConnectedBroker(): ConnectedBroker | null {
  try {
    const raw = localStorage.getItem(BROKER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearConnectedBroker(): void {
  try {
    localStorage.removeItem(BROKER_KEY);
  } catch {
    // ignore
  }
}

// ── Summary calculation ───────────────────────────────────────────────────

export function calcSummary(holdings: PricedHolding[]): PortfolioSummary {
  const done = holdings.filter((h) => !h.priceLoading && !h.priceError);
  return {
    totalInvestedINR: done.reduce((s, h) => s + h.investedINR, 0),
    totalCurrentINR: done.reduce((s, h) => s + h.currentValueINR, 0),
    totalPnlINR: done.reduce((s, h) => s + h.pnlINR, 0),
    totalPnlPct:
      done.reduce((s, h) => s + h.investedINR, 0) > 0
        ? (done.reduce((s, h) => s + h.pnlINR, 0) /
            done.reduce((s, h) => s + h.investedINR, 0)) *
          100
        : 0,
    stocksValueINR: done.filter((h) => h.type === "stock").reduce((s, h) => s + h.currentValueINR, 0),
    cryptoValueINR: done.filter((h) => h.type === "crypto").reduce((s, h) => s + h.currentValueINR, 0),
    mfValueINR: done.filter((h) => h.type === "mf").reduce((s, h) => s + h.currentValueINR, 0),
  };
}

// ── Format helpers ────────────────────────────────────────────────────────

export function fmtINR(n: number): string {
  if (Math.abs(n) >= 1e7) return "₹" + (n / 1e7).toFixed(2) + "Cr";
  if (Math.abs(n) >= 1e5) return "₹" + (n / 1e5).toFixed(2) + "L";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

// ── Build AI analysis prompt ──────────────────────────────────────────────

export function buildPortfolioPrompt(holdings: PricedHolding[], usdInr: number): string {
  const lines = ["Mera portfolio analyze karo aur detailed insights do:\n"];

  const stocks = holdings.filter((h) => h.type === "stock" && !h.priceError);
  const cryptos = holdings.filter((h) => h.type === "crypto" && !h.priceError);
  const mfs = holdings.filter((h) => h.type === "mf");

  if (stocks.length) {
    lines.push("📈 STOCKS:");
    stocks.forEach((h) => {
      lines.push(
        `  - ${h.name} (${h.symbol}): ${h.quantity} shares | Buy: ₹${h.buyPrice} | Current: ₹${h.currentPrice.toFixed(0)} | P&L: ${fmtINR(h.pnlINR)} (${fmtPct(h.pnlPct)})`
      );
    });
  }

  if (cryptos.length) {
    lines.push("\n💰 CRYPTO:");
    cryptos.forEach((h) => {
      lines.push(
        `  - ${h.name} (${h.symbol}): ${h.quantity} coins | Buy: $${h.buyPrice} | Current: $${h.currentPrice.toFixed(2)} | P&L: ${fmtINR(h.pnlINR)} (${fmtPct(h.pnlPct)})`
      );
    });
  }

  if (mfs.length) {
    lines.push("\n🏦 MUTUAL FUNDS:");
    mfs.forEach((h) => {
      lines.push(
        `  - ${h.name}: ${h.quantity} units | Buy NAV: ₹${h.buyPrice} | Current NAV: ₹${h.currentPrice} | P&L: ${fmtINR(h.pnlINR)} (${fmtPct(h.pnlPct)})`
      );
    });
  }

  const summary = calcSummary(holdings);
  lines.push(`\nTotal Invested: ${fmtINR(summary.totalInvestedINR)}`);
  lines.push(`Total Current Value: ${fmtINR(summary.totalCurrentINR)}`);
  lines.push(`Overall P&L: ${fmtINR(summary.totalPnlINR)} (${fmtPct(summary.totalPnlPct)})`);
  lines.push(`\nUSD/INR rate used: ₹${usdInr}`);
  lines.push("\nKripya batao: diversification kaisi hai, koi concentrated risk hai, kya changes karne chahiye?");

  return lines.join("\n");
}

/** Context from holdings before live prices load (after file upload). */
export function buildPortfolioAIContextFromHoldings(
  holdings: Holding[],
  rawDocumentText?: string,
  fileName?: string
): string {
  const lines = [
    `User ne apna portfolio upload kiya${fileName ? ` (${fileName})` : ""}. Is data par based portfolio-related sawaalon ka jawab do.\n`,
  ];

  if (holdings.length) {
    lines.push("Holdings:");
    holdings.forEach((h) => {
      const cur = h.currency === "USD" ? "$" : "₹";
      lines.push(
        `  - ${h.name} (${h.symbol}, ${h.type}): ${h.quantity} units @ ${cur}${h.buyPrice}`
      );
    });
  }

  if (rawDocumentText?.trim()) {
    lines.push("\n--- Document text ---");
    lines.push(rawDocumentText.slice(0, 8000));
  }

  if (!holdings.length && !rawDocumentText?.trim()) {
    lines.push("(Koi data nahi mila)");
  }

  lines.push(
    "\nUser portfolio se related kuch bhi pooch sakta hai — allocation, risk, P&L, diversification, tax, rebalancing, etc."
  );

  return lines.join("\n");
}

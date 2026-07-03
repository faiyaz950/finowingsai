"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddHoldingModal from "@/components/portfolio/AddHoldingModal";
import ConnectPortfolioModal from "@/components/portfolio/ConnectPortfolioModal";
import DonutChart from "@/components/portfolio/DonutChart";
import HoldingCard from "@/components/portfolio/HoldingCard";
import Logo from "@/components/Logo";
import {
  addHolding,
  buildPortfolioPrompt,
  buildPortfolioAIContext,
  calcSummary,
  clearAllHoldings,
  fmtINR,
  fmtPct,
  getPortfolioAIContext,
  getPortfolioSourceMeta,
  loadHoldings,
  loadConnectedBroker,
  removeHolding,
  savePortfolioAIContext,
  syncPortfolioAIContext,
  type ConnectedBroker,
  type Holding,
  type PricedHolding,
  type PortfolioSourceMeta,
} from "@/lib/portfolio";
import {
  fetchCryptoPrices,
  fetchStockPrices,
  getUsdInrRate,
  type PriceResult,
} from "@/lib/priceApi";

function toPricedHolding(
  h: Holding,
  price: PriceResult | undefined,
  usdInr: number,
  loading: boolean
): PricedHolding {
  const investedINR =
    h.quantity * h.buyPrice * (h.currency === "USD" ? usdInr : 1);

  if (loading) {
    return { ...h, currentPrice: 0, currentValue: 0, currentValueINR: 0, investedINR, pnlINR: 0, pnlPct: 0, change24h: 0, priceLoading: true, priceError: false };
  }
  if (!price) {
    return { ...h, currentPrice: 0, currentValue: 0, currentValueINR: 0, investedINR, pnlINR: 0, pnlPct: 0, change24h: 0, priceLoading: false, priceError: true };
  }

  const currentPrice = price.price;
  const currentValue = h.quantity * currentPrice;
  const currentValueINR = h.type === "crypto" ? currentValue * usdInr : currentValue;
  const pnlINR = currentValueINR - investedINR;
  const pnlPct = investedINR > 0 ? (pnlINR / investedINR) * 100 : 0;

  return { ...h, currentPrice, currentValue, currentValueINR, investedINR, pnlINR, pnlPct, change24h: price.change24h, priceLoading: false, priceError: false };
}

const StatCard = ({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon: string }) => (
  <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: "#13131c", border: "1px solid #1e1e2a" }}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#5a5a72" }}>{label}</span>
      <span className="text-base">{icon}</span>
    </div>
    <p className="text-xl font-bold" style={{ color: color ?? "#f0f0f5" }}>{value}</p>
    {sub && <p className="text-xs" style={{ color: color ? color + "aa" : "#5a5a72" }}>{sub}</p>}
  </div>
);

export default function PortfolioPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [priced, setPriced] = useState<PricedHolding[]>([]);
  const [usdInr, setUsdInr] = useState(84);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectedBroker, setConnectedBroker] = useState<ConnectedBroker | null>(null);
  const [sourceMeta, setSourceMeta] = useState<PortfolioSourceMeta | null>(null);
  const [hasAIContext, setHasAIContext] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "stock" | "crypto" | "mf">("all");

  useEffect(() => {
    setHoldings(loadHoldings());
    setConnectedBroker(loadConnectedBroker());
    setSourceMeta(getPortfolioSourceMeta());
    setHasAIContext(!!getPortfolioAIContext());
  }, []);

  const refreshPrices = useCallback(async (items: Holding[]) => {
    setLoadingPrices(true);
    const rate = await getUsdInrRate();
    setUsdInr(rate);

    const stocks = items.filter((h) => h.type === "stock").map((h) => h.symbol);
    const cryptos = items.filter((h) => h.type === "crypto").map((h) => h.symbol);

    let stockPrices: Record<string, PriceResult> = {};
    let cryptoPrices: Record<string, PriceResult> = {};
    try {
      [stockPrices, cryptoPrices] = await Promise.all([
        fetchStockPrices(stocks).catch(() => ({})),
        fetchCryptoPrices(cryptos).catch(() => ({})),
      ]);
    } catch { /* partial ok */ }

    setPriced(items.map((h) => {
      if (h.type === "mf") {
        return toPricedHolding(h, { symbol: h.symbol, price: h.buyPrice, priceINR: h.buyPrice, change24h: 0, name: h.name }, rate, false);
      }
      const prices = h.type === "stock" ? stockPrices : cryptoPrices;
      return toPricedHolding(h, prices[h.symbol.toUpperCase()], rate, false);
    }));
    setLoadingPrices(false);
  }, []);

  useEffect(() => {
    if (!holdings.length) { setPriced([]); setLoadingPrices(false); return; }
    setPriced(holdings.map((h) => toPricedHolding(h, undefined, usdInr, true)));
    refreshPrices(holdings);
  }, [holdings, refreshKey, refreshPrices]);

  useEffect(() => {
    if (loadingPrices || !holdings.length) return;
    const ready = priced.some((p) => !p.priceLoading);
    if (!ready) return;
    syncPortfolioAIContext(priced, usdInr);
    setHasAIContext(true);
    setSourceMeta(getPortfolioSourceMeta());
  }, [priced, loadingPrices, usdInr, holdings.length]);

  const summary = useMemo(() => calcSummary(priced), [priced]);

  const chartSegments = useMemo(() => [
    { label: "Stocks", value: summary.stocksValueINR, color: "#10b981" },
    { label: "Crypto", value: summary.cryptoValueINR, color: "#f59e0b" },
    { label: "Mutual Funds", value: summary.mfValueINR, color: "#7c6ff7" },
  ], [summary]);

  const handleAdd = (h: Omit<Holding, "id" | "addedAt">) => {
    addHolding(h);
    setHoldings(loadHoldings());
    setShowAddModal(false);
  };

  const handleRemove = (id: string) => {
    removeHolding(id);
    setHoldings(loadHoldings());
  };

  const handleAnalyze = () => {
    const prompt = holdings.length
      ? buildPortfolioPrompt(priced, usdInr)
      : "Analyze my uploaded portfolio document — explain allocation, risk, and suggest improvements.";
    if (holdings.length) {
      const fullContext = buildPortfolioAIContext(priced, usdInr);
      savePortfolioAIContext(fullContext, { importedAt: new Date().toISOString(), format: "holdings" });
    }
    sessionStorage.setItem("arjunai_portfolio_prompt", prompt);
    router.push("/");
  };

  const handleClear = () => {
    if (!confirm("Clear entire portfolio? This cannot be undone.")) return;
    clearAllHoldings();
    setHoldings([]); setPriced([]); setConnectedBroker(null); setSourceMeta(null); setHasAIContext(false);
  };

  const pnlPositive = summary.totalPnlINR >= 0;
  const filteredPriced = activeTab === "all" ? priced : priced.filter((h) => h.type === activeTab);

  const TABS = [
    { id: "all" as const, label: "All", count: priced.length },
    { id: "stock" as const, label: "Stocks", count: priced.filter((h) => h.type === "stock").length, color: "#10b981" },
    { id: "crypto" as const, label: "Crypto", count: priced.filter((h) => h.type === "crypto").length, color: "#f59e0b" },
    { id: "mf" as const, label: "MF", count: priced.filter((h) => h.type === "mf").length, color: "#7c6ff7" },
  ];

  return (
    <div className="min-h-full" style={{ background: "#0a0a0f", color: "#f0f0f5" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
        style={{ background: "#0a0a0fe8", borderBottom: "1px solid #1a1a25", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#5a5a72" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f5"; e.currentTarget.style.background = "#1a1a25"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#5a5a72"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Logo size={24} />
          <div>
            <h1 className="text-sm font-bold" style={{ color: "#f0f0f5" }}>My Portfolio</h1>
            <p className="text-xs" style={{ color: "#5a5a72" }}>
              {holdings.length} holdings · USD/INR ₹{usdInr.toFixed(1)}
              {connectedBroker && <span style={{ color: "#10b981" }}> · {connectedBroker.name}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sourceMeta?.fileName && (
            <span className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg truncate max-w-[160px]"
              style={{ background: "#1a1a25", color: "#9898b0", border: "1px solid #2a2a3a" }}>
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {sourceMeta.fileName}
            </span>
          )}
          <button onClick={() => setShowConnectModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "#1a1a25", color: "#7c6ff7", border: "1px solid #7c6ff730" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#7c6ff715"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1a1a25"; }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Demat
          </button>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loadingPrices}
            className="p-1.5 rounded-lg transition-all"
            style={{ background: "#1a1a25", color: "#5a5a72", border: "1px solid #2a2a3a" }}
            title="Refresh prices"
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#5a5a72"; }}>
            <svg className={`w-4 h-4 ${loadingPrices ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #6c5ce7, #7c6ff7)", color: "#fff", boxShadow: "0 4px 12px rgba(108,92,231,0.3)" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Holding
          </button>
          {holdings.length > 0 && (
            <button onClick={handleClear}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#5a5a72" }}
              title="Clear portfolio"
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5a5a72"; }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Invested"
            value={fmtINR(summary.totalInvestedINR)}
            sub={`${holdings.length} positions`}
            icon="💼"
          />
          <StatCard
            label="Current Value"
            value={fmtINR(summary.totalCurrentINR)}
            sub={loadingPrices ? "Fetching live prices..." : "Live prices"}
            icon="📈"
          />
          <StatCard
            label="Overall P&L"
            value={`${pnlPositive ? "+" : ""}${fmtINR(summary.totalPnlINR)}`}
            sub={fmtPct(summary.totalPnlPct)}
            color={pnlPositive ? "#10b981" : "#f87171"}
            icon={pnlPositive ? "🟢" : "🔴"}
          />
        </div>

        {/* ── Allocation Panel ── */}
        {(holdings.length > 0 || hasAIContext) && (
          <div className="rounded-2xl p-5" style={{ background: "#13131c", border: "1px solid #1e1e2a" }}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <DonutChart segments={chartSegments} total={summary.totalCurrentINR} size={130} />

              <div className="flex-1 w-full space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#5a5a72" }}>Asset Allocation</p>
                {chartSegments.filter((s) => s.value > 0).map((seg) => {
                  const pct = summary.totalCurrentINR > 0 ? ((seg.value / summary.totalCurrentINR) * 100).toFixed(1) : "0";
                  return (
                    <div key={seg.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                          <span style={{ color: "#a0a0b8" }}>{seg.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: "#5a5a72" }}>{pct}%</span>
                          <span className="font-medium text-sm">{fmtINR(seg.value)}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "#1a1a25" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: seg.color, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleAnalyze}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg, #6c5ce7, #7c6ff7)", color: "#fff", boxShadow: "0 4px 16px rgba(108,92,231,0.25)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(108,92,231,0.45)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(108,92,231,0.25)"; }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Analyze with Finowings AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Holdings ── */}
        {holdings.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "#13131c", border: "1px dashed #2a2a3a" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: "#1a1a25" }}>📊</div>
            <h3 className="text-base font-semibold mb-2" style={{ color: "#f0f0f5" }}>
              {sourceMeta?.fileName ? "No holdings found" : "Your portfolio is empty"}
            </h3>
            <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "#5a5a72" }}>
              {sourceMeta?.fileName
                ? `Could not parse holdings from "${sourceMeta.fileName}". Try re-uploading an Order History or Holdings CSV.`
                : "Connect your Demat account or add holdings manually to get started."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowConnectModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #6c5ce7, #7c6ff7)", color: "#fff" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Demat Account
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#1a1a25", color: "#a0a0b8", border: "1px solid #2a2a3a" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Manually
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "#13131c", border: "1px solid #1e1e2a" }}>
              {TABS.filter((t) => t.count > 0 || t.id === "all").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: activeTab === tab.id ? "#2a2a3a" : "transparent",
                    color: activeTab === tab.id ? (tab.color ?? "#f0f0f5") : "#5a5a72",
                  }}>
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs"
                      style={{ background: activeTab === tab.id ? "#3a3a52" : "#1a1a25", color: activeTab === tab.id ? (tab.color ?? "#a0a0b8") : "#3a3a52" }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Holdings grid */}
            {filteredPriced.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: "#13131c", border: "1px dashed #2a2a3a" }}>
                <p className="text-sm" style={{ color: "#5a5a72" }}>No {activeTab} holdings yet.</p>
                <button onClick={() => setShowAddModal(true)}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg"
                  style={{ color: "#7c6ff7", background: "rgba(124,111,247,0.1)" }}>
                  + Add one
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPriced.map((h) => (
                  <HoldingCard key={h.id} holding={h} usdInr={usdInr} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer note */}
        <p className="text-center text-xs pb-4" style={{ color: "#2a2a3a" }}>
          Prices: CoinGecko (crypto) · Yahoo Finance (stocks) · Manual (MF) · For reference only, not financial advice
        </p>
      </main>

      {showConnectModal && (
        <ConnectPortfolioModal
          onClose={() => setShowConnectModal(false)}
          onImported={(h) => {
            setHoldings(h);
            setConnectedBroker(loadConnectedBroker());
            setSourceMeta(getPortfolioSourceMeta());
            setHasAIContext(!!getPortfolioAIContext());
          }}
          onManualAdd={() => setShowAddModal(true)}
        />
      )}
      {showAddModal && <AddHoldingModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

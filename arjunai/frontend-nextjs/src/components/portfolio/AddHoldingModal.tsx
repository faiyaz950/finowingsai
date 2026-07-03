"use client";

import { useState, useEffect, FormEvent } from "react";
import type { AssetType, Holding } from "@/lib/portfolio";
import { POPULAR_STOCKS, POPULAR_CRYPTOS, CRYPTO_ID_MAP } from "@/lib/portfolio";

interface Props {
  onAdd: (h: Omit<Holding, "id" | "addedAt">) => void;
  onClose: () => void;
}

const TABS: { id: AssetType; label: string; icon: string; color: string }[] = [
  { id: "stock", label: "Stock", icon: "📈", color: "#10b981" },
  { id: "crypto", label: "Crypto", icon: "₿", color: "#f59e0b" },
  { id: "mf", label: "Mutual Fund", icon: "🏦", color: "#7c6ff7" },
];

export default function AddHoldingModal({ onAdd, onClose }: Props) {
  const [type, setType] = useState<AssetType>("stock");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [error, setError] = useState("");
  const [symbolSuggestions, setSymbolSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Auto-fill name for crypto
  useEffect(() => {
    if (type === "crypto") {
      const cryptoNames: Record<string, string> = {
        BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana",
        ADA: "Cardano", XRP: "Ripple", MATIC: "Polygon", AVAX: "Avalanche",
        DOT: "Polkadot", LINK: "Chainlink", DOGE: "Dogecoin", SHIB: "Shiba Inu",
      };
      const upper = symbol.toUpperCase();
      if (cryptoNames[upper]) setName(cryptoNames[upper]);
    }
  }, [symbol, type]);

  // Filter suggestions
  useEffect(() => {
    if (!symbol.trim()) { setSymbolSuggestions([]); return; }
    const q = symbol.toUpperCase();
    if (type === "stock") {
      setSymbolSuggestions(POPULAR_STOCKS.filter((s) => s.startsWith(q)).slice(0, 5));
    } else if (type === "crypto") {
      setSymbolSuggestions(POPULAR_CRYPTOS.filter((s) => s.startsWith(q)).slice(0, 5));
    } else {
      setSymbolSuggestions([]);
    }
  }, [symbol, type]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const sym = symbol.trim().toUpperCase();
    const nm = name.trim() || sym;
    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);

    if (!sym) return setError("Symbol / naam zaroori hai");
    if (!qty || qty <= 0) return setError("Quantity valid honi chahiye");
    if (!price || price <= 0) return setError("Buy price valid hona chahiye");
    if (type === "crypto" && !CRYPTO_ID_MAP[sym]) {
      return setError(`"${sym}" CoinGecko mein nahi mila. BTC, ETH, SOL, BNB, etc. try karein.`);
    }

    onAdd({
      type,
      symbol: sym,
      name: nm,
      quantity: qty,
      buyPrice: price,
      currency: type === "crypto" ? "USD" : "INR",
    });
  };

  const inputStyle = {
    background: "#0d0d14",
    border: "1px solid #2a2a3a",
    color: "#f0f0f5",
  };

  const activeCfg = TABS.find((t) => t.id === type)!;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden fade-in-up"
          style={{ background: "#16161f", border: "1px solid #2a2a3a", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #2a2a3a" }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "#f0f0f5" }}>Add Holding</h2>
              <p className="text-xs" style={{ color: "#5a5a72" }}>Portfolio mein add karo</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#5a5a72" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f5"; e.currentTarget.style.background = "#2a2a3a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5a5a72"; e.currentTarget.style.background = "transparent"; }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Type tabs */}
          <div className="flex p-4 gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setType(tab.id); setSymbol(""); setName(""); setError(""); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                style={{
                  background: type === tab.id ? `${tab.color}15` : "#13131c",
                  color: type === tab.id ? tab.color : "#5a5a72",
                  border: `1px solid ${type === tab.id ? `${tab.color}30` : "#2a2a3a"}`,
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
            {/* Symbol */}
            <div className="relative">
              <label className="block text-xs font-medium mb-1" style={{ color: "#9898b0" }}>
                {type === "stock" ? "NSE Symbol" : type === "crypto" ? "Crypto Symbol" : "Fund Name"}
              </label>
              <input
                value={symbol}
                onChange={(e) => { setSymbol(e.target.value); setShowSuggestions(true); }}
                onFocus={(e) => { setShowSuggestions(true); e.currentTarget.style.borderColor = `${activeCfg.color}50`; }}
                onBlur={(e) => { setTimeout(() => setShowSuggestions(false), 150); e.currentTarget.style.borderColor = "#2a2a3a"; }}
                placeholder={
                  type === "stock" ? "e.g. TCS, RELIANCE, INFY" :
                  type === "crypto" ? "e.g. BTC, ETH, SOL" :
                  "e.g. Parag Parikh Flexi Cap"
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all uppercase"
                style={{ ...inputStyle, textTransform: type === "mf" ? "none" : "uppercase" }}
                autoFocus
              />
              {/* Suggestions dropdown */}
              {showSuggestions && symbolSuggestions.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden"
                  style={{ background: "#13131c", border: "1px solid #2a2a3a", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                >
                  {symbolSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full text-left px-3.5 py-2 text-xs transition-colors"
                      style={{ color: "#d0d0e0" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a25")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onMouseDown={() => { setSymbol(s); setShowSuggestions(false); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#9898b0" }}>
                Display Name <span style={{ color: "#5a5a72" }}>(optional)</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "stock" ? "e.g. Tata Consultancy Services" : type === "crypto" ? "Auto-filled" : "e.g. Parag Parikh Flexi Cap Direct"}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${activeCfg.color}50`)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a3a")}
              />
            </div>

            {/* Qty + Price row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#9898b0" }}>
                  {type === "mf" ? "Units" : type === "crypto" ? "Coins" : "Shares"}
                </label>
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 10"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${activeCfg.color}50`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a3a")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#9898b0" }}>
                  Buy Price <span style={{ color: "#5a5a72" }}>({type === "crypto" ? "$" : "₹"})</span>
                </label>
                <input
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder={type === "crypto" ? "e.g. 42000" : "e.g. 3500"}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${activeCfg.color}50`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a3a")}
                />
              </div>
            </div>

            {/* Crypto hint */}
            {type === "crypto" && (
              <p className="text-xs" style={{ color: "#5a5a72" }}>
                Supported: {POPULAR_CRYPTOS.join(", ")}
              </p>
            )}

            {error && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.2)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: `linear-gradient(135deg, ${activeCfg.color}, ${activeCfg.color}cc)`,
                color: "#fff",
                boxShadow: `0 4px 16px ${activeCfg.color}30`,
              }}
            >
              Add to Portfolio
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

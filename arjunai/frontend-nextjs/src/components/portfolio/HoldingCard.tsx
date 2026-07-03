"use client";

import type { PricedHolding } from "@/lib/portfolio";
import { fmtINR, fmtPct } from "@/lib/portfolio";

interface Props {
  holding: PricedHolding;
  usdInr: number;
  onRemove: (id: string) => void;
}

const TYPE_CONFIG = {
  stock: { icon: "📈", color: "#10b981", label: "Stock" },
  crypto: { icon: "₿", color: "#f59e0b", label: "Crypto" },
  mf: { icon: "🏦", color: "#7c6ff7", label: "MF" },
};

export default function HoldingCard({ holding: h, usdInr, onRemove }: Props) {
  const cfg = TYPE_CONFIG[h.type];
  const isPositive = h.pnlINR >= 0;
  const pnlColor = isPositive ? "#10b981" : "#f87171";
  const priceDisplay =
    h.type === "crypto"
      ? `$${h.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} (₹${(h.currentPrice * usdInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })})`
      : `₹${h.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div
      className="group relative rounded-2xl p-4 transition-all duration-150"
      style={{ background: "#13131c", border: "1px solid #1e1e2a" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a3a")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2a")}
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(h.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
        style={{ color: "#5a5a72" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#5a5a72"; }}
        title="Remove holding"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
        >
          {cfg.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: "#f0f0f5" }}>
              {h.symbol}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-md"
              style={{ background: `${cfg.color}12`, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="text-xs truncate" style={{ color: "#5a5a72" }}>{h.name}</div>
        </div>
      </div>

      {/* Price loading / error */}
      {h.priceLoading && (
        <div className="flex items-center gap-1.5 py-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#2a2a3a" }} />
          <span className="text-xs" style={{ color: "#5a5a72" }}>Fetching price…</span>
        </div>
      )}

      {h.priceError && (
        <div className="text-xs py-1" style={{ color: "#f87171" }}>
          ⚠️ Price unavailable — check symbol
        </div>
      )}

      {!h.priceLoading && !h.priceError && (
        <>
          {/* Price row */}
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-base font-bold" style={{ color: "#f0f0f5" }}>{priceDisplay}</span>
            <span
              className="text-xs font-medium"
              style={{ color: h.change24h >= 0 ? "#10b981" : "#f87171" }}
            >
              {h.change24h >= 0 ? "▲" : "▼"} {Math.abs(h.change24h).toFixed(2)}% (24h)
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs mb-0.5" style={{ color: "#5a5a72" }}>Qty</div>
              <div className="text-xs font-semibold" style={{ color: "#d0d0e0" }}>
                {h.quantity.toLocaleString("en-IN", { maximumFractionDigits: 6 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs mb-0.5" style={{ color: "#5a5a72" }}>Invested</div>
              <div className="text-xs font-semibold" style={{ color: "#d0d0e0" }}>
                {fmtINR(h.investedINR)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs mb-0.5" style={{ color: "#5a5a72" }}>Current</div>
              <div className="text-xs font-semibold" style={{ color: "#d0d0e0" }}>
                {fmtINR(h.currentValueINR)}
              </div>
            </div>
          </div>

          {/* P&L bar */}
          <div
            className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl"
            style={{
              background: isPositive ? "rgba(16,185,129,0.06)" : "rgba(248,113,113,0.06)",
              border: `1px solid ${isPositive ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)"}`,
            }}
          >
            <span className="text-xs font-medium" style={{ color: "#9898b0" }}>P&amp;L</span>
            <div className="text-right">
              <span className="text-sm font-bold" style={{ color: pnlColor }}>
                {fmtINR(Math.abs(h.pnlINR))}
              </span>
              <span className="text-xs ml-1.5 font-medium" style={{ color: pnlColor }}>
                ({fmtPct(h.pnlPct)})
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

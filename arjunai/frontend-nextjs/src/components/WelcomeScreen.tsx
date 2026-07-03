"use client";

import { useState } from "react";
import Logo from "@/components/Logo";

interface Props {
  onSuggestion: (text: string) => void;
  hasPortfolio?: boolean;
}

type Category = "stocks" | "crypto" | "mutual_funds";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "crypto", label: "Crypto" },
  { id: "mutual_funds", label: "Mutual Funds" },
];

const SUGGESTIONS: Record<Category, { text: string; tag: string }[]> = {
  stocks: [
    { text: "Reliance Industries ka complete fundamental analysis karo", tag: "Fundamental" },
    { text: "TCS vs Infosys vs HCL Tech — konsa IT stock best value deta hai?", tag: "Compare" },
    { text: "Nifty 50 mein top performing sectors kaun se hain?", tag: "Index" },
    { text: "HDFC Bank ka technical analysis — RSI, MACD, support levels", tag: "Technical" },
    { text: "Small cap stocks mein high ROE, low debt wale hidden gems", tag: "Screener" },
    { text: "Upcoming IPO ka GMP aur subscription rate kaise check karein?", tag: "IPO" },
  ],
  crypto: [
    { text: "Bitcoin ka current market cycle — bull run aayega ya nahi?", tag: "BTC" },
    { text: "Ethereum vs Solana — DeFi ke basis pe konsa better hai?", tag: "ETH vs SOL" },
    { text: "India mein crypto pe 30% tax aur 1% TDS kaise lagta hai?", tag: "Tax" },
    { text: "Bitcoin halving ka price pe kya effect hota hai?", tag: "Halving" },
    { text: "Bitcoin dominance aur altcoin season kya hota hai?", tag: "Market Cycle" },
    { text: "Crypto portfolio safe kaise rakhen — storage aur risk tips", tag: "Safety" },
  ],
  mutual_funds: [
    { text: "SIP ke liye best large cap mutual funds — expense ratio aur CAGR", tag: "SIP" },
    { text: "ELSS fund se 80C mein ₹1.5L ka tax kaise bachaye?", tag: "Tax Saving" },
    { text: "Index fund vs actively managed fund — long term mein kaun better?", tag: "Index vs Active" },
    { text: "₹10,000/month SIP se 20 saal mein kitna corpus bnega?", tag: "Calculator" },
    { text: "Parag Parikh Flexi Cap vs Mirae Asset Large Cap comparison", tag: "Compare" },
    { text: "Debt mutual funds vs FD — risk, return, liquidity comparison", tag: "Debt vs FD" },
  ],
};

export default function WelcomeScreen({ onSuggestion, hasPortfolio }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("stocks");

  const portfolioSuggestions = hasPortfolio
    ? [
        { text: "Mere portfolio ki diversification theek hai ya nahi?", tag: "Portfolio" },
        { text: "Sabse zyada loss wali holding kaun si hai aur kya karun?", tag: "P&L" },
        { text: "Risk kam karne ke liye portfolio mein kya badlav karun?", tag: "Rebalance" },
        { text: "Sector-wise exposure breakdown batao", tag: "Allocation" },
      ]
    : [];

  return (
    <div className="flex flex-col items-center justify-start h-full overflow-y-auto px-4 py-10">
      {/* Logo + Title */}
      <div className="text-center mb-8">
        <Logo size={56} className="justify-center mb-4" />
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#f0f0f0" }}>
          Finowings AI
        </h1>
        <p className="text-sm" style={{ color: "#666666" }}>
          Indian Stocks · Crypto · Mutual Funds ka expert AI
        </p>
      </div>

      {portfolioSuggestions.length > 0 && (
        <div className="w-full max-w-xl mb-6">
          <p className="text-xs font-medium mb-2" style={{ color: "#7c6ff7" }}>
            Aapka portfolio loaded hai — seedha poochho
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {portfolioSuggestions.map((s, i) => (
              <button
                key={`pf-${i}`}
                onClick={() => onSuggestion(s.text)}
                className="text-left px-4 py-3 rounded-xl transition-all duration-150 border"
                style={{
                  background: "#14141f",
                  borderColor: "#7c6ff730",
                }}
              >
                <div className="text-xs font-medium mb-1" style={{ color: "#7c6ff7" }}>
                  {s.tag}
                </div>
                <div className="text-sm leading-snug" style={{ color: "#cccccc" }}>
                  {s.text}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1 mb-5 w-full max-w-xl">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: activeCategory === cat.id ? "#222222" : "transparent",
              color: activeCategory === cat.id ? "#f0f0f0" : "#555555",
              border: activeCategory === cat.id ? "1px solid #333333" : "1px solid transparent",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTIONS[activeCategory].map((s, i) => (
          <button
            key={`${activeCategory}-${i}`}
            onClick={() => onSuggestion(s.text)}
            className="text-left px-4 py-3 rounded-xl transition-all duration-150 border fade-in-up"
            style={{
              background: "#111111",
              borderColor: "#222222",
              animationDelay: `${i * 30}ms`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1a1a1a";
              e.currentTarget.style.borderColor = "#333333";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#111111";
              e.currentTarget.style.borderColor = "#222222";
            }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: "#555555" }}>{s.tag}</div>
            <div className="text-sm leading-snug" style={{ color: "#cccccc" }}>{s.text}</div>
          </button>
        ))}
      </div>

      <p className="text-xs mt-8" style={{ color: "#333333" }}>
        Ya seedha apna sawaal type karo — Hindi, Hinglish, ya English mein
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { TrendingUp, Bitcoin, PiggyBank, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

interface Props {
  onSuggestion: (text: string) => void;
  hasPortfolio?: boolean;
}

type Category = "stocks" | "crypto" | "mutual_funds";

const CATEGORIES: { id: Category; label: string; shortLabel: string; icon: typeof TrendingUp }[] = [
  { id: "stocks", label: "Stocks", shortLabel: "Stocks", icon: TrendingUp },
  { id: "crypto", label: "Crypto", shortLabel: "Crypto", icon: Bitcoin },
  { id: "mutual_funds", label: "Mutual Funds", shortLabel: "MF", icon: PiggyBank },
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

const HERO_FEATURES = [
  { label: "Live market data", color: "#10b981" },
  { label: "Thinking paths", color: "#9b8cff" },
  { label: "Charts & analysis", color: "#f59e0b" },
];

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
    <div className="welcome-screen h-full overflow-y-auto overflow-x-hidden">
      <div className="welcome-screen-inner mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 pb-8 sm:pb-10">

        {/* Hero */}
        <section className="welcome-hero relative mb-6 sm:mb-8 md:mb-10 rounded-2xl sm:rounded-3xl overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,111,247,0.18) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(16,185,129,0.08) 0%, transparent 50%)",
            }}
          />
          <div className="card-elevated relative px-4 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12 text-center">
            <div className="flex justify-center mb-4 sm:mb-5">
              <div
                className="welcome-logo-wrap rounded-2xl p-2.5 sm:p-3"
                style={{ background: "rgba(124,111,247,0.1)", border: "1px solid rgba(124,111,247,0.2)" }}
              >
                <Logo size={64} className="justify-center" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 sm:mb-4 text-xs font-medium"
              style={{ background: "rgba(124,111,247,0.12)", color: "#9b8cff", border: "1px solid rgba(124,111,247,0.25)" }}
            >
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span>India&apos;s Financial AI</span>
            </div>

            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 tracking-tight px-1"
              style={{ color: "#f5f5f5" }}
            >
              Finowings AI
            </h1>

            <p
              className="text-sm sm:text-base max-w-md mx-auto leading-relaxed px-2"
              style={{ color: "#888888" }}
            >
              Stocks, Crypto &amp; Mutual Funds — detailed analysis, live charts, aur smart follow-ups
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 sm:mt-6 px-1">
              {HERO_FEATURES.map((f) => (
                <span
                  key={f.label}
                  className="text-xs sm:text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{
                    background: `${f.color}14`,
                    color: f.color,
                    border: `1px solid ${f.color}30`,
                  }}
                >
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio quick prompts */}
        {portfolioSuggestions.length > 0 && (
          <section className="mb-6 sm:mb-8 w-full">
            <p className="text-xs sm:text-sm font-medium mb-3 px-0.5" style={{ color: "#9b8cff" }}>
              Aapka portfolio loaded hai — seedha poochho
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {portfolioSuggestions.map((s, i) => (
                <SuggestionCard key={`pf-${i}`} tag={s.tag} text={s.text} onClick={() => onSuggestion(s.text)} accent />
              ))}
            </div>
          </section>
        )}

        {/* Category tabs */}
        <section className="mb-4 sm:mb-5 w-full">
          <p className="text-xs font-medium mb-2.5 px-0.5 hidden sm:block" style={{ color: "#555" }}>
            Topic choose karein
          </p>
          <div className="welcome-tabs scrollbar-hide -mx-1 px-1 flex gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className="welcome-tab flex items-center justify-center gap-1.5 sm:gap-2 flex-shrink-0 sm:flex-1 min-h-[44px] px-4 sm:px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: isActive ? "rgba(124,111,247,0.15)" : "transparent",
                    color: isActive ? "#c4b8ff" : "#666",
                    border: isActive ? "1px solid rgba(124,111,247,0.35)" : "1px solid #222",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="sm:hidden">{cat.shortLabel}</span>
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Suggestion cards */}
        <section className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {SUGGESTIONS[activeCategory].map((s, i) => (
              <SuggestionCard
                key={`${activeCategory}-${i}`}
                tag={s.tag}
                text={s.text}
                onClick={() => onSuggestion(s.text)}
                delay={i * 30}
              />
            ))}
          </div>
        </section>

        <p
          className="text-center text-xs sm:text-sm mt-6 sm:mt-8 px-4"
          style={{ color: "#444" }}
        >
          Ya seedha apna sawaal type karo — Hindi, Hinglish, ya English mein
        </p>
      </div>
    </div>
  );
}

function SuggestionCard({
  tag,
  text,
  onClick,
  accent = false,
  delay = 0,
}: {
  tag: string;
  text: string;
  onClick: () => void;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-elevated welcome-suggestion text-left w-full min-h-[72px] sm:min-h-[80px] px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all duration-150 fade-in-up active:scale-[0.98]"
      style={{
        backgroundColor: accent ? "#14141f" : undefined,
        borderColor: accent ? "rgba(124,111,247,0.25)" : undefined,
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = accent ? "#1a1a28" : "#1a1a1a";
        e.currentTarget.style.borderColor = accent ? "rgba(124,111,247,0.4)" : "#333333";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = accent ? "#14141f" : "";
        e.currentTarget.style.borderColor = accent ? "rgba(124,111,247,0.25)" : "";
      }}
    >
      <div
        className="text-xs font-semibold mb-1 sm:mb-1.5"
        style={{ color: accent ? "#9b8cff" : "#555555" }}
      >
        {tag}
      </div>
      <div
        className="text-sm leading-snug line-clamp-3 sm:line-clamp-none"
        style={{ color: "#cccccc" }}
      >
        {text}
      </div>
    </button>
  );
}

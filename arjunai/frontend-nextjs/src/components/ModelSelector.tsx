"use client";

import { useState, useRef, useEffect } from "react";
import type { AIModelId, AIModelOption } from "@/lib/types";

interface Props {
  models: AIModelOption[];
  selected: AIModelId;
  onChange: (id: AIModelId) => void;
  disabled?: boolean;
}

const MODEL_ICONS: Record<AIModelId, string> = {
  auto: "⚡",
  gemini: "✦",
  openai: "◎",
  grok: "𝕏",
  groq: "⬡",
  claude: "◆",
};

export default function ModelSelector({ models, selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = models.find((m) => m.id === selected) ?? models[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: open ? "#1f1f1f" : "#161616",
          color: disabled ? "#444444" : "#aaaaaa",
          border: "1px solid",
          borderColor: open ? "#333333" : "#222222",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.borderColor = "#333333"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = "#222222"; }}
      >
        <span>{MODEL_ICONS[selected] ?? "AI"}</span>
        <span className="hidden sm:inline">{current?.label ?? "Auto"}</span>
        <svg
          className="w-3 h-3 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "#555555" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-72 rounded-xl overflow-hidden z-30 fade-in card-elevated"
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid #222222" }}>
            <p className="text-xs font-medium" style={{ color: "#666666" }}>AI Model choose karein</p>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {models.map((model) => {
              const isSelected = model.id === selected;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: isSelected ? "rgba(136,136,136,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#1a1a1a"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="text-sm mt-0.5 flex-shrink-0">{MODEL_ICONS[model.id] ?? "AI"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: isSelected ? "#e0e0e0" : "#bbbbbb" }}>
                        {model.label}
                      </span>
                      {model.pro_only && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1f1f1f", color: "#888888" }}>
                          Pro
                        </span>
                      )}
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#555555" }}>
                      {model.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

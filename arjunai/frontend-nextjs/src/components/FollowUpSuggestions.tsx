"use client";

interface Props {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export default function FollowUpSuggestions({ suggestions, onSelect }: Props) {
  if (!suggestions.length) return null;

  return (
    <div className="mt-5 pt-4" style={{ borderTop: "1px solid #1e1e2a" }}>
      <p className="text-xs font-medium mb-3" style={{ color: "#666" }}>
        Suggested follow-ups
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((text, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(text)}
            className="card-elevated text-left text-xs px-3.5 py-2.5 rounded-xl transition-all duration-150"
            style={{
              backgroundColor: "#14141f",
              color: "#bbb",
              maxWidth: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1a1a28";
              e.currentTarget.style.borderColor = "#7c6ff740";
              e.currentTarget.style.color = "#ddd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#14141f";
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.color = "#bbb";
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

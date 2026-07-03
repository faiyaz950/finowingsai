"use client";

import { useState, useMemo } from "react";
import type { Conversation, UserType } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  userType: UserType;
  questionsLeft: number;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUserTypeChange: (type: UserType) => void;
  isOpen: boolean;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Sidebar({
  conversations, activeId, userType, questionsLeft,
  onNew, onSelect, onDelete, onUserTypeChange, isOpen,
}: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  if (!isOpen) return null;

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: "256px", background: "#0f0f0f", borderRight: "1px solid #1f1f1f" }}
    >
      {/* Header */}
      <div className="px-3 pt-4 pb-3">
        <div className="px-2 mb-4">
          <Logo size={28} showName />
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={onNew}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ background: "#1a1a1a", color: "#cccccc", border: "1px solid #2a2a2a" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#222222"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1a1a1a"; }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          <button
            onClick={() => router.push("/portfolio")}
            className="flex items-center justify-center w-10 rounded-lg transition-all duration-150"
            style={{ background: "#1a1a1a", color: "#7c6ff7", border: "1px solid #2a2a2a" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#222222"; e.currentTarget.style.borderColor = "#7c6ff730"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.borderColor = "#2a2a2a"; }}
            title="My Portfolio"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#444444" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="bg-transparent text-xs outline-none flex-1"
            style={{ color: "#cccccc" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: "#444444" }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-xs" style={{ color: "#444444" }}>
              {search ? `No results for "${search}"` : "No conversations yet"}
            </p>
          </div>
        ) : (
          <>
            <div className="px-2 pb-1 text-xs font-medium" style={{ color: "#333333" }}>
              {search ? `${filtered.length} results` : "Recent"}
            </div>
            {filtered.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 transition-all duration-100"
                style={{
                  background: activeId === conv.id ? "#1f1f1f" : "transparent",
                }}
                onMouseEnter={(e) => { if (activeId !== conv.id) e.currentTarget.style.background = "#161616"; }}
                onMouseLeave={(e) => { if (activeId !== conv.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: activeId === conv.id ? "#e0e0e0" : "#888888" }}>
                    {conv.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#333333" }}>{timeAgo(conv.createdAt)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded flex-shrink-0"
                  style={{ color: "#444444" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#444444"; }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="p-3 space-y-2" style={{ borderTop: "1px solid #1f1f1f" }}>
        {/* Plan toggle */}
        <div className="flex rounded-lg p-0.5" style={{ background: "#1a1a1a" }}>
          {(["free", "pro"] as UserType[]).map((type) => (
            <button
              key={type}
              onClick={() => onUserTypeChange(type)}
              className="flex-1 py-1.5 text-xs font-medium capitalize transition-all duration-150 rounded-md"
              style={{
                background: userType === type ? "#2a2a2a" : "transparent",
                color: userType === type ? "#e0e0e0" : "#555555",
              }}
            >
              {type === "pro" ? "Pro" : "Free"}
            </button>
          ))}
        </div>

        {/* Questions left */}
        {userType === "free" && (
          <div className="px-3 py-2.5 rounded-lg" style={{ background: "#1a1a1a" }}>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: "#666666" }}>Questions left</span>
              <span style={{ color: questionsLeft > 3 ? "#10b981" : questionsLeft > 0 ? "#f59e0b" : "#f87171" }}>
                {questionsLeft}/10
              </span>
            </div>
            <div className="w-full h-1 rounded-full" style={{ background: "#2a2a2a" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(questionsLeft / 10) * 100}%`,
                  background: questionsLeft > 3 ? "#10b981" : questionsLeft > 0 ? "#f59e0b" : "#f87171",
                }}
              />
            </div>
          </div>
        )}

        {userType === "pro" && (
          <div className="px-3 py-2 rounded-lg text-center" style={{ background: "#1a1a1a" }}>
            <div className="text-xs font-medium" style={{ color: "#888888" }}>Pro — Unlimited</div>
          </div>
        )}

        {/* User */}
        {user && (
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
            style={{ background: "#1a1a1a" }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "#2a2a2a", color: "#cccccc" }}
            >
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "#cccccc" }}>{user.name}</div>
              <div className="text-xs truncate" style={{ color: "#444444" }}>{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1 rounded transition-colors flex-shrink-0"
              style={{ color: "#444444" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#444444"; }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

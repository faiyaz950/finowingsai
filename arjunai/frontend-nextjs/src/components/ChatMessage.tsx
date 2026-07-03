"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";
import { TOPIC_CONFIG } from "@/lib/types";
import ModelBadge from "./ModelBadge";
import Logo from "@/components/Logo";

interface Props {
  message: Message;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(date: Date): string {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return formatTime(date);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " + formatTime(date);
}

export default function ChatMessage({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  if (isUser) {
    const hasAttachments = message.attachments && message.attachments.length > 0;
    return (
      <div
        className="fade-in-up flex justify-end mb-6"
        onMouseEnter={() => setShowTimestamp(true)}
        onMouseLeave={() => setShowTimestamp(false)}
      >
        <div className="flex flex-col items-end gap-1 max-w-[95%]">
          {/* Attachments */}
          {hasAttachments && (
            <div className="flex flex-wrap gap-2 justify-end mb-1">
              {message.attachments!.map((att) => (
                <div
                  key={att.id}
                  className="rounded-lg overflow-hidden"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                >
                  {att.type === "image" ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="max-w-[200px] max-h-[200px] object-contain cursor-pointer"
                      onClick={() => window.open(att.url, "_blank")}
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#666666" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-xs" style={{ color: "#888888" }}>{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Message text */}
          {message.content && (
            <div
              className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
              style={{ background: "#1f1f1f", color: "#e0e0e0", border: "1px solid #2a2a2a" }}
            >
              {message.content}
            </div>
          )}
          {showTimestamp && (
            <span className="text-xs fade-in" style={{ color: "#444444" }}>
              {formatDate(message.timestamp)}
            </span>
          )}
        </div>
      </div>
    );
  }

  const topicCfg = message.topic ? TOPIC_CONFIG[message.topic] : null;

  return (
    <div
      className="fade-in-up flex gap-3 mb-8 group"
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <Logo size={28} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "#666666" }}>Finowings AI</span>
          {topicCfg && message.topic && message.topic !== "general" && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ background: "#1a1a1a", color: "#666666", border: "1px solid #2a2a2a" }}
            >
              {topicCfg.label}
            </span>
          )}
          {showTimestamp && !message.isStreaming && (
            <span className="text-xs fade-in" style={{ color: "#333333" }}>
              {formatDate(message.timestamp)}
            </span>
          )}
        </div>

        {/* Message body */}
        <div className="relative">
          <div className="prose-dark">
            {message.isStreaming && !message.content ? (
              <div className="flex items-center gap-1.5 py-2">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#444444", animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#444444", animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#444444", animationDelay: "300ms" }} />
              </div>
            ) : (
              <div className={message.isStreaming ? "typing-cursor" : ""}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Copy button */}
          {!message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-150 p-1.5 rounded-lg inline-flex items-center gap-1.5"
              style={{
                background: "transparent",
                color: copied ? "#10b981" : "#444444",
              }}
              title={copied ? "Copied!" : "Copy"}
              onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = "#888888"; }}
              onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = "#444444"; }}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {!message.isStreaming && message.model && (
          <ModelBadge model={message.model} cached={message.cached} />
        )}

        {!message.isStreaming && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #1f1f1f" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "#555555" }}>
              Google Search sources
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((src, i) => (
                <a
                  key={`${src.url}-${i}`}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: "#141414", color: "#888888", border: "1px solid #222222" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#bbbbbb"; e.currentTarget.style.borderColor = "#333333"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; e.currentTarget.style.borderColor = "#222222"; }}
                >
                  {src.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

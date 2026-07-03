"use client";

import { useState, useRef, useEffect } from "react";
import type { Attachment } from "@/lib/types";

interface Props {
  onSend: (text: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const QUICK_CHIPS = [
  { label: "Stocks", text: "NSE/BSE stocks analysis" },
  { label: "Crypto", text: "Cryptocurrency market analysis" },
  { label: "Mutual Fund", text: "Best mutual funds for SIP" },
  { label: "IPO", text: "Upcoming IPO analysis aur GMP" },
  { label: "Technical", text: "Technical analysis" },
  { label: "Gold/MCX", text: "Gold aur MCX commodities" },
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES = ["application/pdf", "text/plain", "text/csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  useEffect(() => {
    return () => {
      attachments.forEach((att) => URL.revokeObjectURL(att.url));
    };
  }, [attachments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length && attachments.length + newAttachments.length < MAX_FILES; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} bahut bada hai (max 10MB)`);
        continue;
      }

      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isFile = ALLOWED_FILE_TYPES.includes(file.type);

      if (!isImage && !isFile) {
        alert(`${file.name} supported nahi hai. Images (jpg, png, gif, webp) aur documents (pdf, txt, csv) hi upload kar sakte hain.`);
        continue;
      }

      newAttachments.push({
        id: generateId(),
        type: isImage ? "image" : "file",
        name: file.name,
        mimeType: file.type,
        url: URL.createObjectURL(file),
        size: file.size,
        file,
      });
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleChip = (chipText: string) => {
    if (disabled) return;
    setValue(chipText + " ");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = value.length;
  const isOverLimit = charCount > 1000;
  const canSend = (value.trim() || attachments.length > 0) && !disabled && !isOverLimit;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-2">
      {/* Quick chips */}
      {!disabled && attachments.length === 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChip(chip.text)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-100 whitespace-nowrap"
              style={{ background: "#161616", color: "#666666", border: "1px solid #222222" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1f1f1f"; e.currentTarget.style.color = "#aaaaaa"; e.currentTarget.style.borderColor = "#333333"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#161616"; e.currentTarget.style.color = "#666666"; e.currentTarget.style.borderColor = "#222222"; }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs px-1" style={{ color: "#666666" }}>
            Image/file analysis ke liye Gemini ya OpenAI model automatically use hoga
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative flex-shrink-0 rounded-lg overflow-hidden group"
              style={{ background: "#161616", border: "1px solid #222222" }}
            >
              {att.type === "image" ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <div className="h-16 w-24 flex flex-col items-center justify-center px-2">
                  <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="#666666" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs truncate w-full text-center" style={{ color: "#888888" }}>
                    {att.name.length > 10 ? att.name.slice(0, 8) + "..." : att.name}
                  </span>
                  <span className="text-xs" style={{ color: "#555555" }}>{formatFileSize(att.size)}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {attachments.length < MAX_FILES && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-16 w-16 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "#161616", border: "1px dashed #333333" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#555555"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#555555" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input box */}
      <div
        className="relative rounded-xl border transition-colors duration-150"
        style={{
          background: "#111111",
          borderColor: canSend ? "#444444" : "#222222",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={placeholder || "Stocks, Crypto, Mutual Funds ke baare mein poochho..."}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3.5 pr-24 text-sm outline-none leading-relaxed"
          style={{ color: "#e0e0e0", maxHeight: "160px", caretColor: "#888888" }}
        />

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= MAX_FILES}
          className="absolute right-12 bottom-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: "transparent",
            cursor: disabled || attachments.length >= MAX_FILES ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#1a1a1a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title="Image ya file attach karein"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={disabled ? "#333333" : "#666666"} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: canSend ? "#333333" : "#1a1a1a",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => { if (canSend) e.currentTarget.style.background = "#444444"; }}
          onMouseLeave={(e) => { if (canSend) e.currentTarget.style.background = "#333333"; }}
        >
          {disabled ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#666666" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={canSend ? "#cccccc" : "#333333"} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>

        {/* Char counter */}
        {charCount > 800 && (
          <div
            className="absolute right-24 bottom-3.5 text-xs"
            style={{ color: isOverLimit ? "#f87171" : "#555555" }}
          >
            {charCount}/1000
          </div>
        )}
      </div>
    </div>
  );
}

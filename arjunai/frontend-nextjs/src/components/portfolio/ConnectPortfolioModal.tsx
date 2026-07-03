"use client";

import { useRef, useState } from "react";
import type { Broker } from "@/lib/brokers";
import {
  INDIAN_BROKERS,
  getBrokerOAuthUrl,
  isBrokerOAuthAvailable,
} from "@/lib/brokers";
import { parsePortfolioFile } from "@/lib/portfolioFileImport";
import type { Holding } from "@/lib/portfolio";
import {
  buildPortfolioAIContextFromHoldings,
  loadHoldings,
  mergeHoldings,
  replaceHoldings,
  saveConnectedBroker,
  savePortfolioAIContext,
} from "@/lib/portfolio";

type Step = "main" | "brokers" | "upload";
type ImportMode = "merge" | "replace";

interface Props {
  onClose: () => void;
  onImported: (holdings: Holding[]) => void;
  onManualAdd: () => void;
  initialBroker?: Broker | null;
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: "#5a5a72" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#f0f0f5";
        e.currentTarget.style.background = "#2a2a3a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#5a5a72";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function BrokerAvatar({ broker }: { broker: Broker }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{
        background: `${broker.color}22`,
        color: broker.color,
        border: `1.5px solid ${broker.color}44`,
      }}
    >
      {broker.initials}
    </div>
  );
}

export default function ConnectPortfolioModal({
  onClose,
  onImported,
  onManualAdd,
  initialBroker = null,
}: Props) {
  const [step, setStep] = useState<Step>(initialBroker ? "upload" : "main");
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(initialBroker);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importPreview, setImportPreview] = useState<number | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBrokerClick = (broker: Broker) => {
    const oauthUrl = getBrokerOAuthUrl(broker);
    if (oauthUrl && isBrokerOAuthAvailable()) {
      window.location.href = oauthUrl;
      return;
    }
    setSelectedBroker(broker);
    setStep("upload");
    setUploadError("");
    setImportPreview(null);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    setImportPreview(null);
    try {
      const result = await parsePortfolioFile(file);

      let merged: Holding[] = loadHoldings();

      if (result.holdingsReady.length) {
        merged =
          importMode === "replace"
            ? replaceHoldings(result.holdingsReady)
            : mergeHoldings(result.holdingsReady);
      } else if (result.rawText) {
        // PDF / partial parse — keep existing holdings, refresh AI context only
        merged = loadHoldings();
      }

      const aiContext = buildPortfolioAIContextFromHoldings(
        merged,
        result.rawText,
        result.fileName
      );
      savePortfolioAIContext(aiContext, {
        fileName: result.fileName,
        format: result.format,
        importedAt: new Date().toISOString(),
      });

      if (result.errors.length && !result.holdingsReady.length && !result.rawText) {
        setUploadError(result.errors.join(" "));
        return;
      }

      if (selectedBroker) {
        saveConnectedBroker({
          id: selectedBroker.id,
          name: selectedBroker.name,
          connectedAt: new Date().toISOString(),
        });
      }

      if (result.holdingsReady.length) {
        setImportPreview(result.holdings.length);
        onImported(merged);
      } else {
        setImportPreview(0);
        setUploadError("");
        onImported(merged);
      }

      setTimeout(onClose, 1500);
    } catch {
      setUploadError("File process nahi ho payi. CSV, Excel ya PDF try karein.");
    } finally {
      setUploading(false);
    }
  };

  const previewBrokers = INDIAN_BROKERS.slice(0, 3);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden fade-in-up max-h-[90vh] overflow-y-auto"
          style={{
            background: "#16161f",
            border: "1px solid #2a2a3a",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* ── Step: Main ── */}
          {step === "main" && (
            <>
              <div className="flex items-start justify-between px-5 py-4">
                <div>
                  <h2 className="text-base font-bold" style={{ color: "#f0f0f5" }}>
                    Connect portfolio
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#5a5a72" }}>
                    India ke major brokers support hain
                  </p>
                </div>
                <CloseBtn onClick={onClose} />
              </div>

              <div className="px-4 pb-4 space-y-3">
                {/* Connect broker card */}
                <button
                  onClick={() => setStep("brokers")}
                  className="w-full text-left rounded-2xl p-4 transition-all duration-150 group"
                  style={{
                    background: "linear-gradient(135deg, #1a1a2e 0%, #12121f 100%)",
                    border: "1px solid #2a2a4a",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7c6ff750")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a4a")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#f0f0f5" }}>
                        Connect your broker
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#7c6ff7" }}>
                        Import in 30 seconds
                      </p>
                      <div className="flex items-center gap-1.5 mt-3">
                        {previewBrokers.map((b) => (
                          <BrokerAvatar key={b.id} broker={b} />
                        ))}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#7c6ff720", color: "#7c6ff7" }}
                        >
                          +{INDIAN_BROKERS.length - 3} more
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 shrink-0" style={{ color: "#5a5a72" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Manual upload card */}
                <button
                  onClick={() => {
                    setSelectedBroker(null);
                    setStep("upload");
                  }}
                  className="w-full text-left rounded-2xl p-4 transition-all duration-150"
                  style={{ background: "#13131c", border: "1px solid #2a2a3a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3a3a4a")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a3a")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#f0f0f5" }}>
                        Upload holdings file
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#5a5a72" }}>
                        CSV, Excel, PDF — kisi bhi broker ka statement
                      </p>
                    </div>
                    <svg className="w-5 h-5 shrink-0" style={{ color: "#5a5a72" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Manual one-by-one */}
                <button
                  onClick={() => {
                    onClose();
                    onManualAdd();
                  }}
                  className="w-full text-center text-xs py-2 transition-colors"
                  style={{ color: "#5a5a72" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#9898b0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#5a5a72")}
                >
                  Ya ek-ek holding manually add karein →
                </button>

                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <svg className="w-3.5 h-3.5" style={{ color: "#7c6ff7" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs" style={{ color: "#5a5a72" }}>
                    100% secure — data sirf aapke browser mein rehta hai
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ── Step: Broker grid ── */}
          {step === "brokers" && (
            <>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #2a2a3a" }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep("main")}
                    className="p-1 rounded-lg"
                    style={{ color: "#5a5a72" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: "#f0f0f5" }}>
                      Import your holdings
                    </h2>
                    <p className="text-xs" style={{ color: "#5a5a72" }}>Apna broker select karein</p>
                  </div>
                </div>
                <CloseBtn onClick={onClose} />
              </div>

              <div className="p-4 grid grid-cols-4 sm:grid-cols-5 gap-3">
                {INDIAN_BROKERS.map((broker) => (
                  <button
                    key={broker.id}
                    onClick={() => handleBrokerClick(broker)}
                    className="flex flex-col items-center gap-2 p-2 rounded-xl transition-all"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a25")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <BrokerAvatar broker={broker} />
                    <span className="text-[10px] text-center leading-tight" style={{ color: "#9898b0" }}>
                      {broker.name}
                    </span>
                  </button>
                ))}
              </div>

              {!isBrokerOAuthAvailable() && (
                <p className="text-xs text-center px-4 pb-4" style={{ color: "#5a5a72" }}>
                  Broker login ke liye CSV upload use hoga. Direct OAuth jald aa raha hai.
                </p>
              )}
            </>
          )}

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #2a2a3a" }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(selectedBroker ? "brokers" : "main")}
                    className="p-1 rounded-lg"
                    style={{ color: "#5a5a72" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: "#f0f0f5" }}>
                      {selectedBroker ? `${selectedBroker.name} holdings` : "Upload CSV"}
                    </h2>
                    <p className="text-xs" style={{ color: "#5a5a72" }}>
                      Holdings file upload karein
                    </p>
                  </div>
                </div>
                <CloseBtn onClick={onClose} />
              </div>

              <div className="p-4 space-y-4">
                {selectedBroker && (
                  <div
                    className="flex items-start gap-3 p-3 rounded-xl text-xs"
                    style={{ background: "#13131c", border: "1px solid #2a2a3a", color: "#9898b0" }}
                  >
                    <BrokerAvatar broker={selectedBroker} />
                    <p>{selectedBroker.csvHint}</p>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />

                <div className="flex gap-2 text-xs">
                  {(["replace", "merge"] as ImportMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setImportMode(mode)}
                      className="flex-1 py-2 rounded-lg transition-colors"
                      style={{
                        background: importMode === mode ? "#7c6ff720" : "#13131c",
                        color: importMode === mode ? "#7c6ff7" : "#5a5a72",
                        border: `1px solid ${importMode === mode ? "#7c6ff750" : "#2a2a3a"}`,
                      }}
                    >
                      {mode === "replace" ? "Replace portfolio" : "Merge with existing"}
                    </button>
                  ))}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !uploading && fileRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && !uploading) handleFile(f);
                  }}
                  className="w-full py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer"
                  style={{
                    borderColor: dragOver ? "#7c6ff7" : uploading ? "#7c6ff750" : "#2a2a3a",
                    background: dragOver ? "#7c6ff708" : "#0d0d14",
                    color: "#9898b0",
                  }}
                >
                  {uploading ? (
                    <span className="block text-center">Import ho raha hai…</span>
                  ) : importPreview !== null ? (
                    <span className="block text-center" style={{ color: "#10b981" }}>
                      {importPreview > 0
                        ? `✓ ${importPreview} holdings import ho gayi!`
                        : "✓ File save ho gayi — AI ab document se jawab de sakta hai"}
                    </span>
                  ) : (
                    <div className="space-y-2 text-center">
                      <svg className="w-8 h-8 mx-auto" style={{ color: "#7c6ff7" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm font-medium" style={{ color: "#f0f0f5" }}>
                        Portfolio file yahan drop karein
                      </p>
                      <p className="text-xs">CSV, Excel (.xlsx), PDF — ya click karke select karein</p>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p
                    className="text-xs px-3 py-2 rounded-xl"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      color: "#fca5a5",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    {uploadError}
                  </p>
                )}

                <p className="text-xs text-center" style={{ color: "#5a5a72" }}>
                  CSV / Excel: Symbol, Quantity, Avg Price · PDF: statement se auto-extract
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

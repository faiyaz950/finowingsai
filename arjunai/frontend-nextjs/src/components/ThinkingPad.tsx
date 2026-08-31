"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, Brain, Check, Loader2 } from "lucide-react";

interface Props {
  steps: string[];
  isActive?: boolean;
  live?: boolean;
  defaultExpanded?: boolean;
  onRevealComplete?: () => void;
}

function nextStepChunk(current: string, full: string): string {
  const remaining = full.slice(current.length);
  if (!remaining) return full;
  const word = remaining.match(/^(\s*\S+\s*)/);
  if (word && word[1].length <= 28) return current + word[1];
  return current + remaining.slice(0, Math.min(3, remaining.length));
}

export default function ThinkingPad({
  steps,
  isActive = false,
  live = false,
  defaultExpanded = true,
  onRevealComplete,
}: Props) {
  const reduceMotion = useReducedMotion();
  const liveRef = useRef(Boolean(isActive || live));
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onRevealComplete);
  const lastShownRef = useRef<HTMLLIElement | null>(null);

  onCompleteRef.current = onRevealComplete;
  if (isActive || live) liveRef.current = true;

  const realSteps = steps.filter((s) => s.trim().length > 0);
  const stepCount = realSteps.length;
  const live = liveRef.current && !reduceMotion;

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [doneCount, setDoneCount] = useState(() => (live ? 0 : stepCount));
  const [typed, setTyped] = useState("");
  const currentFull = realSteps[doneCount] ?? "";

  useEffect(() => {
    if (!live) {
      setDoneCount(stepCount);
      setTyped("");
      return;
    }

    if (doneCount >= stepCount) {
      setTyped("");
      return;
    }

    if (!currentFull) return;

    if (typed.length >= currentFull.length) {
      const t = window.setTimeout(() => {
        setDoneCount((c) => c + 1);
        setTyped("");
      }, 480);
      return () => window.clearTimeout(t);
    }

    const t = window.setTimeout(() => {
      setTyped((prev) => nextStepChunk(prev, currentFull));
    }, 22);
    return () => window.clearTimeout(t);
  }, [live, stepCount, currentFull, doneCount, typed]);

  const allTyped = realSteps.length > 0 && doneCount >= realSteps.length;
  const working = isActive || (live && !allTyped);
  const stillRevealing = live && !allTyped;

  useEffect(() => {
    if (completedRef.current) return;
    const emptyIdle = !isActive && realSteps.length === 0;
    if ((allTyped && !isActive) || emptyIdle || (reduceMotion && !isActive && realSteps.length > 0)) {
      completedRef.current = true;
      onCompleteRef.current?.();
      if (!emptyIdle) {
        const t = window.setTimeout(() => setExpanded(false), 1600);
        return () => window.clearTimeout(t);
      }
    }
  }, [allTyped, isActive, realSteps.length, reduceMotion]);

  useEffect(() => {
    lastShownRef.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [doneCount, typed, reduceMotion]);

  if (!realSteps.length && !isActive) return null;

  const currentIndex = Math.min(doneCount, Math.max(realSteps.length - 1, 0));
  const shownDone = realSteps.slice(0, doneCount);
  const currentStep = stillRevealing && realSteps[doneCount] ? realSteps[doneCount] : null;
  const total = Math.max(realSteps.length, shownDone.length + (currentStep ? 1 : 0), 1);

  return (
    <div className="card-elevated mb-4 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-11 transition-colors cursor-pointer"
        style={{ background: "rgba(124, 111, 247, 0.06)" }}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {working ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9b8cff" }} />
          ) : (
            <Brain className="w-4 h-4" style={{ color: "#9b8cff" }} />
          )}
          <span className="text-sm font-semibold" style={{ color: "#9b8cff" }}>
            Thinking Paths
          </span>
          <span className="text-xs" style={{ color: "#666" }}>
            {working
              ? `Working · ${Math.min(doneCount + (currentStep ? 1 : 0), total)}/${total}`
              : `${realSteps.length} steps`}
          </span>
          {working && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#9b8cff" }} />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: "#666" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "#666" }} />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-3" aria-live="polite" aria-busy={working}>
          <div className="relative pl-4">
            <div
              className="absolute left-[7px] top-2 bottom-2 w-px"
              style={{ background: "linear-gradient(180deg, #7c6ff7 0%, #333 100%)" }}
            />
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {shownDone.map((step, i) => (
                  <motion.li
                    key={`done-${i}`}
                    className="relative flex gap-3"
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span
                      className="absolute -left-4 top-1 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "#2a2a3a" }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: "#9b8cff" }} />
                    </span>
                    <p className="text-xs leading-relaxed pl-3" style={{ color: "#999" }}>
                      <span className="font-semibold mr-1.5" style={{ color: "#9b8cff" }}>
                        {i + 1}.
                      </span>
                      {step}
                    </p>
                  </motion.li>
                ))}
              </AnimatePresence>

              {currentStep && (
                <li ref={lastShownRef} className="relative flex gap-3">
                  <span
                    className="absolute -left-4 top-1 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#9b8cff", boxShadow: "0 0 8px rgba(155,140,255,0.6)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                  <p
                    className={`text-xs leading-relaxed pl-3 ${typed.length < currentStep.length ? "thinking-caret" : ""}`}
                    style={{ color: "#c8c4e8" }}
                  >
                    <span className="font-semibold mr-1.5" style={{ color: "#9b8cff" }}>
                      {currentIndex + 1}.
                    </span>
                    {typed || " "}
                  </p>
                </li>
              )}

              {working && !currentStep && shownDone.length === 0 && (
                <li className="relative flex gap-3">
                  <span
                    className="absolute -left-4 top-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "#9b8cff", boxShadow: "0 0 8px rgba(155,140,255,0.6)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                  <p className="text-xs leading-relaxed pl-3 thinking-caret" style={{ color: "#c8c4e8" }}>
                    <span className="font-semibold mr-1.5" style={{ color: "#9b8cff" }}>
                      1.
                    </span>
                    Interpreting your question and planning the analysis…
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

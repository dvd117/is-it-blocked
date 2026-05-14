"use client";

import type { LoadingPhase } from "@/features/check/types";
import { useT } from "@/i18n/context";

const steps: LoadingPhase[] = ["server", "browser", "done"];

export function PhaseIndicator({ phase }: { phase: LoadingPhase }) {
  const { t } = useT();
  const activeIndex = steps.indexOf(phase);

  return (
    <div className={`phase-indicator${phase === "done" ? " phase-indicator--done" : ""}`} aria-live="polite">
      {steps.map((step, index) => {
        const completed = index < activeIndex;
        const active = index === activeIndex;

        return (
          <div
            className={`phase-step${active ? " active" : ""}${completed ? " completed" : ""}`}
            key={step}
          >
            <span className="phase-step-marker" aria-hidden="true">
              {completed ? "✓" : String(index + 1)}
            </span>
            <span className="phase-step-label">{t(`phase.${step}`)}</span>
          </div>
        );
      })}
    </div>
  );
}

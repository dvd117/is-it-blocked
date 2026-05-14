"use client";

import { useState } from "react";
import type { BrowserSignal, DiagnosisVerdict } from "@/domain/types";
import { ISP_NAMES } from "@/domain/types";
import { useT } from "@/i18n/context";

interface ReportFormProps {
  domain: string;
  browserSignal: BrowserSignal | null;
  verdict: DiagnosisVerdict | null;
}

export default function ReportForm({ domain, browserSignal, verdict }: ReportFormProps) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const [isp, setIsp] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          isp,
          browserResult: browserSignal,
          diagnosis: verdict,
          manualNotes,
          consent: true,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? t("report.error"));
      }

      setSubmitted(true);
    } catch {
      setError(t("report.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="report-panel" aria-live="polite">
        <p className="report-success">
          {t("report.thanks")}
        </p>
      </section>
    );
  }

  return (
    <section className="report-panel">
      {!expanded && (
        <button className="report-toggle" type="button" onClick={() => setExpanded(true)}>
          {t("report.toggle")}
        </button>
      )}

      {expanded && (
        <form className="report-form" onSubmit={handleSubmit}>
          <div className="report-field">
            <label htmlFor="report-isp">{t("report.ispLabel")}</label>
            <select
              id="report-isp"
              value={isp}
              onChange={(e) => setIsp(e.target.value)}
              required
            >
              <option value="">{t("report.ispPlaceholder")}</option>
              {ISP_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="report-field">
            <label htmlFor="report-notes">{t("report.notesLabel")}</label>
            <textarea
              id="report-notes"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              rows={3}
              placeholder={t("report.notesPlaceholder")}
            />
          </div>

          <label className="report-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              {t("report.consent")}
            </span>
          </label>

          {error && <p className="report-error" role="alert">{error}</p>}

          <button className="report-submit" type="submit" disabled={!consent || submitting}>
            {submitting ? t("report.submitting") : t("report.submit")}
          </button>
        </form>
      )}
    </section>
  );
}

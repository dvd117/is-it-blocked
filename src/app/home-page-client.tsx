"use client";

import { useRef, useState, type FormEvent } from "react";
import { SiteHeader } from "@/features/check/components/site-header";
import { SearchForm } from "@/features/check/components/search-form";
import {
  AssessmentCard,
  BrowserCard,
  CsvCard,
  OoniCard,
  ServerCard,
} from "@/features/check/components/evidence-cards";
import NerdMode from "@/features/check/components/nerd-mode";
import { PhaseIndicator } from "@/features/check/components/phase-indicator";
import { probeMultiple } from "@/features/check/browser-probe";
import { runCheck } from "@/features/check/check-workflow";
import { shouldRunComparisonProbe } from "@/features/check/comparison-consent";
import { initialPageState, type PageState, type RichComparisonTarget } from "@/features/check/types";
import { useT } from "@/i18n/context";
import { APP_VERSION } from "@/config/app-version";
import type { BrowserSignal, CheckResponse } from "@/domain/types";

export default function HomePage() {
  const { lang, t } = useT();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<PageState>(initialPageState);
  const abortRef = useRef<AbortController | null>(null);

  async function getKnownComparisonTargets(domain: string): Promise<RichComparisonTarget[]> {
    const knownTestsRes = await fetch(`/api/known-tests?domain=${encodeURIComponent(domain)}`).catch(() => null);
    const knownData = knownTestsRes?.ok
      ? await knownTestsRes.json().catch(() => null) as { targets?: RichComparisonTarget[] } | null
      : null;

    return Array.isArray(knownData?.targets) ? knownData.targets : [];
  }

  async function getUpdatedResultWithComparison(
    input: string,
    browserSignal: BrowserSignal,
    failedCount: number,
    totalCount: number
  ): Promise<CheckResponse | null> {
    const params = new URLSearchParams({
      url: input,
      lang,
      browserSignal,
      comparisonFailed: String(failedCount),
      comparisonTotal: String(totalCount),
    });
    const response = await fetch(`/api/check?${params.toString()}`).catch(() => null);
    return response?.ok ? await response.json().catch(() => null) as CheckResponse | null : null;
  }

  async function runComparisonProbe(domain: string, input: string, signal: BrowserSignal) {
    setState((prev) => ({ ...prev, comparisonLoading: true, error: null }));

    try {
      const targets = await getKnownComparisonTargets(domain);
      setState((prev) => ({ ...prev, comparisonTargets: targets }));

      if (!shouldRunComparisonProbe(true, targets.map((target) => target.domain))) {
        setState((prev) => ({
          ...prev,
          comparisonLoading: false,
          comparisonTargets: [],
          comparisonResults: [],
          comparisonTotal: 0,
          comparisonFailed: 0,
        }));
        return;
      }

      const probeTargets = targets.map((target) => `https://${target.domain}`);
      const { results, failedCount } = await probeMultiple(probeTargets);
      const comparisonResults = targets.map((target) => ({
        domain: target.domain,
        signal: results.get(`https://${target.domain}`) ?? "inconclusive",
      }));
      const updatedResult = await getUpdatedResultWithComparison(input, signal, failedCount, targets.length);

      setState((prev) => ({
        ...prev,
        result: updatedResult ?? prev.result,
        comparisonLoading: false,
        comparisonTargets: targets,
        comparisonResults,
        comparisonTotal: targets.length,
        comparisonFailed: failedCount,
        finalDiagnosis: updatedResult?.diagnosis ?? prev.finalDiagnosis,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        comparisonLoading: false,
        comparisonTargets: [],
        comparisonResults: [],
        comparisonTotal: 0,
        comparisonFailed: 0,
      }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const input = query.trim();
    if (!input) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({ ...initialPageState, loading: true, phase: "server" });

    try {
      const { result, browserSignal, finalDiagnosis } = await runCheck({
        input,
        lang,
        signal: abort.signal,
        onServerResult: (result) => {
          setState((prev) => ({ ...prev, result, finalDiagnosis: result.diagnosis, phase: "browser" }));
        },
        onBrowserSignal: (signal) => {
          setState((prev) => ({ ...prev, browserSignal: signal }));
        },
      });

      if (abort.signal.aborted) return;

      setState((prev) => ({
        ...prev,
        loading: false,
        phase: "done",
        browserSignal,
        finalDiagnosis,
      }));

      if (browserSignal === "reachable_signal" && result.csvEvidence && result.csvEvidence.blockedOnIsps.length > 0) {
        void runComparisonProbe(result.normalizedDomain, result.inputUrl, browserSignal);
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "";
      setState((prev) => ({ ...prev, loading: false, phase: null, error: message }));
    }
  }

  async function handleComparisonProbe() {
    const domain = state.result?.normalizedDomain;
    const input = state.result?.inputUrl;
    const signal = state.browserSignal;
    if (!domain || !input || !signal || state.comparisonLoading) return;

    await runComparisonProbe(domain, input, signal);
  }

  const {
    loading,
    comparisonLoading,
    phase,
    result,
    browserSignal,
    comparisonTargets,
    comparisonResults,
    comparisonTotal,
    comparisonFailed,
    finalDiagnosis,
    error,
  } = state;
  const showCards = loading || result !== null;
  const domain = result?.normalizedDomain ?? "";
  const browserLoading = loading && (phase === "server" || phase === "browser");
  const serverLoading = loading && phase === "server";

  return (
    <>
      <SiteHeader />
      <main className="main-layout">
        <SearchForm query={query} loading={loading} onQueryChange={setQuery} onSubmit={handleSubmit} />

        {error && <div className="error-banner">{error}</div>}

        {showCards && (
          <>
            {phase && (loading || phase === "done") && <PhaseIndicator phase={phase} />}
            <div className="cards-grid">
              <AssessmentCard diagnosis={finalDiagnosis} loading={loading} />
              <BrowserCard
                signal={browserSignal}
                domain={domain}
                comparisonTargets={comparisonTargets}
                comparisonResults={comparisonResults ?? []}
                comparisonTotal={comparisonTotal}
                comparisonFailed={comparisonFailed}
                loading={browserLoading}
                comparisonLoading={comparisonLoading}
                canRunComparison={Boolean(domain && browserSignal)}
                onRunComparison={handleComparisonProbe}
              />
              <ServerCard probe={result?.serverProbe ?? null} domain={domain} loading={serverLoading} />
              <CsvCard evidence={result?.csvEvidence ?? null} loading={serverLoading} />
              <OoniCard evidence={result?.ooniEvidence ?? null} loading={serverLoading} />
            </div>
            <NerdMode domain={domain} />
          </>
        )}
        <footer className="footer-disclaimer">
          {t("footer.disclaimer")} <span className="app-version">v{APP_VERSION}</span>
        </footer>
      </main>
    </>
  );
}

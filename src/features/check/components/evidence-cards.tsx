import type {
  BrowserSignal,
  CsvEvidence,
  Diagnosis,
  DiagnosisVerdict,
  OoniEvidence,
  ServerProbeResult,
} from "@/domain/types";
import { CATEGORY_LABELS } from "@/domain/types";
import { useT } from "@/i18n/context";
import type { Lang } from "@/i18n/messages";
import type { ComparisonResult, RichComparisonTarget } from "../types";
import { CardSkeleton, confidenceClass } from "./shared";

function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return lang === "es" ? "desconocida" : "unknown";
  const locale = lang === "es" ? "es-VE" : "en-GB";
  const date = new Date(iso);
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

const VE_SIN_FILTRO_SOURCE_URL = "https://bloqueos.vesinfiltro.org/";

function displayStatus(result: string, lang: Lang): string {
  if (result.toLowerCase() === "ok") return "ok";
  return lang === "es" ? "restringido" : "restricted";
}

function verdict(diagnosis: Diagnosis): DiagnosisVerdict {
  return diagnosis.verdict;
}

function comparisonResultLabelKey(signal: BrowserSignal): string {
  if (signal === "reachable_signal") return "card.browser.comparisonResult.reachable";
  if (signal === "failed_signal") return "card.browser.comparisonResult.failed";
  if (signal === "timeout") return "card.browser.comparisonResult.timeout";
  return "card.browser.comparisonResult.inconclusive";
}

function comparisonResultFallbackLabel(signal: BrowserSignal, lang: Lang): string {
  if (signal === "reachable_signal") return lang === "es" ? "alcanzable" : "reachable";
  if (signal === "failed_signal") return lang === "es" ? "restringido" : "restricted";
  if (signal === "timeout") return lang === "es" ? "agotó el tiempo" : "timed out";
  return lang === "es" ? "inconcluso" : "inconclusive";
}

function comparisonResultMark(signal: BrowserSignal, lang: Lang, t: (key: string) => string): { mark: string; color: string; label: string } {
  const key = comparisonResultLabelKey(signal);
  const label = t(key);
  const localizedLabel = label === key ? comparisonResultFallbackLabel(signal, lang) : label;

  if (signal === "reachable_signal") return { mark: "✓", color: "var(--verdict-green)", label: localizedLabel };
  if (signal === "failed_signal" || signal === "timeout") return { mark: "✗", color: "var(--verdict-red)", label: localizedLabel };
  return { mark: "?", color: "var(--verdict-amber)", label: localizedLabel };
}

interface BrowserCardProps {
  signal: BrowserSignal | null;
  domain: string;
  comparisonTargets: RichComparisonTarget[];
  comparisonResults: ComparisonResult[];
  comparisonTotal: number | null;
  comparisonFailed: number | null;
  loading: boolean;
  comparisonLoading: boolean;
  canRunComparison: boolean;
  onRunComparison: () => void;
}

export function BrowserCard({
  signal,
  domain,
  comparisonTargets,
  comparisonResults,
  comparisonTotal,
  comparisonFailed,
  loading,
  comparisonLoading,
  canRunComparison,
  onRunComparison,
}: BrowserCardProps) {
  const { lang, t } = useT();
  const visibleTargets = comparisonTargets.slice(0, 3);
  const comparisonTargetSummary = visibleTargets
    .map((target) => `${target.domain} (${target.blockedIspCount} ISPs)`)
    .join(", ");
  const hiddenTargetCount = Math.max(comparisonTargets.length - visibleTargets.length, 0);
  const comparisonContext =
    comparisonTargetSummary.length > 0
      ? t("card.browser.comparisonTargets", {
          targets: comparisonTargetSummary,
          others: hiddenTargetCount > 0 ? t("card.browser.comparisonTargetsOthers", { count: hiddenTargetCount }) : "",
        })
      : "";
  const dotState =
    loading || comparisonLoading
      ? "loading"
      : signal === "reachable_signal"
        ? "ok"
        : signal === "failed_signal" || signal === "timeout"
          ? "bad"
          : signal === "inconclusive"
            ? "warn"
            : "";

  const signalText = (): string => {
    if (!signal) return "";
    switch (signal) {
      case "reachable_signal":
        return t("card.browser.reachable", { domain });
      case "failed_signal":
        return t("card.browser.failed", { domain });
      case "timeout":
        return t("card.browser.timeout", { domain });
      case "inconclusive":
        return t("card.browser.inconclusive");
    }
  };

  const renderComparisonResults = () => {
    if (comparisonResults.length === 0) return null;

    return (
      <ul
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.78rem",
          listStyle: "none",
          marginTop: "0.4rem",
          padding: 0,
        }}
      >
        {comparisonResults.map((result) => {
          const { mark, color, label } = comparisonResultMark(result.signal, lang, t);
          return (
            <li
              key={result.domain}
              aria-label={`${result.domain}: ${label}`}
              style={{ color: "var(--text-muted)", display: "flex", gap: "0.45rem" }}
            >
              <span aria-hidden="true" style={{ color }}>
                {mark}
              </span>
              <span>{result.domain}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t("card.browser.title")}</span>
        <span className={`card-status-dot ${dotState}`} />
      </div>
      <div className="card-body">
        {!signal && !loading && <p className="result-note">{t("card.browser.waiting")}</p>}
        {loading && <CardSkeleton />}
        {signal && !loading && (
          <>
            <p className="result-primary">{signalText()}</p>
            {comparisonContext && (comparisonLoading || comparisonTotal === null) && (
              <p className="result-note">{comparisonContext}</p>
            )}
            {comparisonLoading && <p className="result-note">{t("card.browser.comparisonLoading")}</p>}
            {!comparisonLoading && comparisonTotal === null && canRunComparison && (
              <div className="comparison-consent">
                <p className="result-note">{t("card.browser.comparisonConsent")}</p>
                <button className="secondary-btn" type="button" onClick={onRunComparison}>
                  {t("card.browser.comparisonButton")}
                </button>
              </div>
            )}
            {!comparisonLoading && comparisonTotal === 0 && (
              <p className="result-note">{t("card.browser.comparisonUnavailable")}</p>
            )}
            {!comparisonLoading && comparisonTotal !== null && comparisonFailed !== null && comparisonFailed > 0 && (
              <>
                <p className="result-note">
                  {t("card.browser.comparisonFailed", { failed: comparisonFailed, total: comparisonTotal })}
                </p>
                {renderComparisonResults()}
              </>
            )}
            {!comparisonLoading && comparisonTotal !== null && comparisonFailed === 0 && comparisonTotal > 0 && (
              <>
                <p className="result-note">{t("card.browser.comparisonOk", { total: comparisonTotal })}</p>
                {renderComparisonResults()}
                <div className="vpn-advisory">
                  <span aria-hidden="true">⚠</span> {t("diagnosis.warning.vpnDns")}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ServerCard({
  probe,
  domain,
  loading,
}: {
  probe: ServerProbeResult | null;
  domain: string;
  loading: boolean;
}) {
  const { t } = useT();
  const dotState = loading ? "loading" : probe ? (probe.reachable ? "ok" : "bad") : "";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t("card.server.title")}</span>
        <span className={`card-status-dot ${dotState}`} />
      </div>
      <div className="card-body">
        {loading && <CardSkeleton />}
        {!loading && !probe && <p className="result-note">{t("card.server.waiting")}</p>}
        {!loading && probe && probe.reachable && (
          <>
            <p className="result-primary">{t("card.server.reachable", { domain })}</p>
            <div className="probe-meta">
              {probe.httpStatus && <span className="badge">HTTP {probe.httpStatus}</span>}
              {probe.responseTimeMs !== null && <span className="badge">{probe.responseTimeMs}ms</span>}
            </div>
            {probe.resolvedIps.length > 0 && (
              <p className="result-note">{t("card.server.dnsResolved", { ips: probe.resolvedIps.join(", ") })}</p>
            )}
          </>
        )}
        {!loading && probe && !probe.reachable && (
          <>
            <p className="result-primary">{t("card.server.unreachable", { domain })}</p>
            {probe.error && <p className="result-note">{probe.error}</p>}
            {probe.dnsResolved && probe.resolvedIps.length > 0 && (
              <p className="result-note">{t("card.server.dnsButFailed", { ips: probe.resolvedIps.join(", ") })}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function CsvCard({ evidence, loading }: { evidence: CsvEvidence | null; loading: boolean }) {
  const { lang, t } = useT();

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t("card.csv.title")}</span>
        <span className={`card-status-dot ${loading ? "loading" : evidence ? "bad" : "ok"}`} />
      </div>
      <div className="card-body">
        {loading && <CardSkeleton />}
        {!loading && !evidence && <p className="result-note">{t("card.csv.noData")}</p>}
        {!loading && evidence && (
          <>
            <p className="result-primary">{t("card.csv.found", { domain: evidence.domain })}</p>
            <div className="category-row">
              <span className="badge badge-category">{CATEGORY_LABELS[evidence.category] ?? evidence.category}</span>
            </div>
            <table className="isp-table">
              <thead>
                <tr>
                  <th>{t("card.csv.ispHeader")}</th>
                  <th>{t("card.csv.statusHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(evidence.ispResults).map(([isp, result]) => (
                  <tr key={isp}>
                    <td>{isp}</td>
                    <td className={result.toLowerCase() === "ok" ? "isp-ok" : "isp-restricted"}>
                      {displayStatus(result, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="isp-count">{t("card.csv.restrictedCount", { count: evidence.blockedOnIsps.length })}</p>
          </>
        )}
        {!loading && (
          <a className="source-link" href={VE_SIN_FILTRO_SOURCE_URL} target="_blank" rel="noreferrer">
            {t("card.csv.source")}
          </a>
        )}
      </div>
    </div>
  );
}

export function OoniCard({ evidence, loading }: { evidence: OoniEvidence | null; loading: boolean }) {
  const { lang, t } = useT();
  const hasData = evidence !== null && evidence.totalCount > 0;
  const dotState = loading ? "loading" : hasData ? (evidence.anomalyCount > 0 ? "warn" : "ok") : "";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t("card.ooni.title")}</span>
        <span className={`card-status-dot ${dotState}`} />
      </div>
      <div className="card-body">
        {loading && <CardSkeleton />}
        {!loading && !hasData && <p className="result-note">{t("card.ooni.noData")}</p>}
        {!loading && hasData && evidence && (
          <>
            <p className="result-primary">
              {t("card.ooni.anomalies", { anomalies: evidence.anomalyCount, total: evidence.totalCount })}
            </p>
            {evidence.confirmedCount > 0 && (
              <p className="result-note">{t("card.ooni.confirmed", { count: evidence.confirmedCount })}</p>
            )}
            <div className="ooni-counts">
              <div className="ooni-stat">
                <span className="ooni-stat-value">{evidence.anomalyCount}</span>
                <span className="ooni-stat-label">{t("card.ooni.anomalyLabel")}</span>
              </div>
              <div className="ooni-stat">
                <span className="ooni-stat-value">{evidence.totalCount}</span>
                <span className="ooni-stat-label">{t("card.ooni.totalLabel")}</span>
              </div>
              {evidence.confirmedCount > 0 && (
                <div className="ooni-stat">
                  <span className="ooni-stat-value">{evidence.confirmedCount}</span>
                  <span className="ooni-stat-label">{t("card.ooni.confirmedLabel")}</span>
                </div>
              )}
            </div>
            <p className="ooni-last-tested">{t("card.ooni.lastTested", { date: formatDate(evidence.lastTested, lang) })}</p>
          </>
        )}
      </div>
    </div>
  );
}

export function AssessmentCard({ diagnosis, loading }: { diagnosis: Diagnosis | null; loading: boolean }) {
  const { t } = useT();
  const dotState = loading
    ? "loading"
    : diagnosis?.verdict === "very_likely_isp_blocking" || diagnosis?.verdict === "likely_isp_blocking"
      ? "bad"
      : diagnosis?.verdict === "inconclusive" || diagnosis?.verdict === "site_may_be_down"
        ? "warn"
        : diagnosis?.verdict === "likely_not_blocked"
          ? "ok"
          : "";

  return (
    <div className={`card card-assessment${diagnosis ? ` verdict-card ${verdict(diagnosis)}` : ""}`}>
      <div className="card-header">
        <span className="card-title">{t("card.assessment.title")}</span>
        <span className={`card-status-dot ${dotState}`} />
      </div>
      <div className="card-body">
        {loading && <CardSkeleton />}
        {!loading && !diagnosis && <p className="result-note">{t("card.assessment.waiting")}</p>}
        {!loading && diagnosis && (
          <>
            <div className="verdict-board" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className={`verdict-label ${verdict(diagnosis)}`}>{t(`verdict.${diagnosis.verdict}`)}</p>
            <div className="verdict-meta">
              <span className={confidenceClass(diagnosis.confidence)}>
                {t("card.assessment.confidence", { level: t(`confidence.${diagnosis.confidence}`) })}
              </span>
            </div>
            <p className="verdict-reasoning">{diagnosis.reasoning}</p>
            {diagnosis.signals.length > 0 && (
              <>
                <p className="signals-label">{t("card.assessment.signals")}</p>
                <ul className="signals-list">
                  {diagnosis.signals.map((signal, index) => (
                    <li key={index}>{signal}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

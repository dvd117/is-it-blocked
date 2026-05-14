import { getAllDomains } from "./csv-evidence";
import type { ComparisonTarget, CsvEvidence } from "@/domain/types";

function blockingMethodStrength(methods: string[]): number {
  return methods.reduce((score, method) => {
    let methodScore = /dns/i.test(method) ? 1 : 0;
    if (/http/i.test(method)) methodScore += 2;
    if (/https/i.test(method)) methodScore += 2;
    if (/tcp ip/i.test(method)) methodScore += 4;
    return score + methodScore;
  }, 0);
}

function hasStrongerBlockingMethod(methods: string[]): boolean {
  return methods.some((method) => method.trim().toLowerCase() !== "dns");
}

const UNSTABLE_COMPARISON_DOMAINS = new Set([
  // Locale redirects can fail browser no-cors probes even when the site is reachable.
  "mullvad.net",
]);

const SERVICE_SUBDOMAIN_PREFIX = /^(api|abs|pbs|upload|video|mobile|m)\./;

function isStableComparisonTarget(evidence: CsvEvidence): boolean {
  return !UNSTABLE_COMPARISON_DOMAINS.has(evidence.domain)
    && !SERVICE_SUBDOMAIN_PREFIX.test(evidence.domain);
}

function comparisonTargetScore(evidence: CsvEvidence): number {
  return blockingMethodStrength(evidence.blockingMethods) * 10
    + evidence.blockedOnIsps.length
}

function toComparisonTarget(evidence: CsvEvidence): ComparisonTarget {
  return {
    domain: evidence.domain,
    category: evidence.category,
    blockedOnIsps: [...evidence.blockedOnIsps],
    blockedIspCount: evidence.blockedOnIsps.length,
    blockingMethods: [...evidence.blockingMethods],
  };
}

export function getComparisonTargets(
  queriedDomain: string,
  category?: string
): ComparisonTarget[] {
  const all = getAllDomains();
  const normalized = queriedDomain.toLowerCase().replace(/^www\./, "");

  const candidates = all
    .filter((e) => e.domain !== normalized)
    .filter(isStableComparisonTarget)
    .filter((e) => e.blockedOnIsps.length >= 4)
    .filter((e) => hasStrongerBlockingMethod(e.blockingMethods))
    .sort((a, b) => {
      const scoreDiff = comparisonTargetScore(b) - comparisonTargetScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return b.blockedOnIsps.length - a.blockedOnIsps.length;
    });

  const sameCategory = category
    ? candidates.filter((e) => e.category === category)
    : [];

  const selected: CsvEvidence[] = [];
  const seen = new Set<string>();

  for (const source of [sameCategory, candidates]) {
    for (const entry of source) {
      if (selected.length >= 8) break;
      if (seen.has(entry.domain)) continue;
      seen.add(entry.domain);
      selected.push(entry);
    }
  }

  return selected.slice(0, 8).map(toComparisonTarget);
}

import { NextRequest, NextResponse } from "next/server";
import { lookupDomain } from "@/services/csv-evidence";
import { queryOoni } from "@/services/ooni-client";
import { getComparisonTargets } from "@/services/probe-targets";
import { probeDomain } from "@/services/server-probe";
import { diagnose } from "@/domain/diagnosis";
import type { CheckResponse, BrowserSignal, ComparisonEvidence } from "@/domain/types";
import type { Lang } from "@/i18n/messages";

const VALID_LANGS: Lang[] = ["es", "en"];

const VALID_BROWSER_SIGNALS: BrowserSignal[] = [
  "reachable_signal",
  "failed_signal",
  "timeout",
  "inconclusive",
];

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

function parseComparisonCount(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url || url.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required parameter: url" },
      { status: 400 }
    );
  }

  const domain = normalizeDomain(url);

  if (!domain || domain.includes(" ")) {
    return NextResponse.json(
      { error: "Invalid URL or domain" },
      { status: 400 }
    );
  }

  const rawLang = request.nextUrl.searchParams.get("lang");
  const lang = rawLang && VALID_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : "en";

  const [csvEvidence, ooniEvidence, serverProbe] = await Promise.all([
    Promise.resolve(lookupDomain(domain)),
    queryOoni(domain),
    probeDomain(domain),
  ]);

  const rawBrowserSignal = request.nextUrl.searchParams.get("browserSignal");
  const browserSignal =
    rawBrowserSignal && VALID_BROWSER_SIGNALS.includes(rawBrowserSignal as BrowserSignal)
      ? (rawBrowserSignal as BrowserSignal)
      : null;

  const comparisonFailed = parseComparisonCount(request.nextUrl.searchParams.get("comparisonFailed"));
  const comparisonTotal = parseComparisonCount(request.nextUrl.searchParams.get("comparisonTotal"));
  const comparison: ComparisonEvidence | null =
    comparisonFailed !== null && comparisonTotal !== null && comparisonFailed <= comparisonTotal
      ? {
          totalProbed: comparisonTotal,
          failedCount: comparisonFailed,
          targets: getComparisonTargets(domain, csvEvidence?.category).slice(0, comparisonTotal).map((target) => ({
            domain: target.domain,
            blockedIspCount: target.blockedIspCount,
          })),
        }
      : null;

  const diagnosis = diagnose({
    csv: csvEvidence,
    ooni: ooniEvidence,
    serverProbe,
    browserSignal,
    comparison,
  }, lang);

  const response: CheckResponse = {
    inputUrl: url,
    normalizedDomain: domain,
    csvEvidence,
    ooniEvidence,
    serverProbe,
    diagnosis,
  };

  return NextResponse.json(response);
}

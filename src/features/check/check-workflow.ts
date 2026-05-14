import type { BrowserSignal, CheckResponse } from "@/domain/types";
import type { Lang } from "@/i18n/messages";
import { probeBrowser } from "./browser-probe";

interface RunCheckOptions {
  input: string;
  lang: Lang;
  signal: AbortSignal;
  onServerResult: (result: CheckResponse) => void;
  onBrowserSignal: (signal: BrowserSignal) => void;
}

async function readJsonError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return (data as { error?: string }).error ?? `${response.status}`;
}

function checkUrl(input: string, lang: Lang, browserSignal?: BrowserSignal): string {
  const params = new URLSearchParams({ url: input, lang });
  if (browserSignal) params.set("browserSignal", browserSignal);
  return `/api/check?${params.toString()}`;
}

export async function runCheck({
  input,
  lang,
  signal,
  onServerResult,
  onBrowserSignal,
}: RunCheckOptions): Promise<{ result: CheckResponse; browserSignal: BrowserSignal; finalDiagnosis: CheckResponse["diagnosis"] }> {
  const serverRes = await fetch(checkUrl(input, lang), { signal });

  if (!serverRes.ok) {
    throw new Error(await readJsonError(serverRes));
  }

  const result: CheckResponse = await serverRes.json();
  onServerResult(result);

  const domain = result.normalizedDomain;
  const browserResult = await probeBrowser(`https://${domain}`);

  if (signal.aborted) {
    return { result, browserSignal: browserResult.signal, finalDiagnosis: result.diagnosis };
  }

  onBrowserSignal(browserResult.signal);

  const recheckRes = await fetch(checkUrl(input, lang, browserResult.signal), { signal }).catch(() => null);
  if (!recheckRes?.ok) {
    return { result, browserSignal: browserResult.signal, finalDiagnosis: result.diagnosis };
  }

  const recheckData: CheckResponse = await recheckRes.json().catch(() => result);
  return {
    result,
    browserSignal: browserResult.signal,
    finalDiagnosis: recheckData.diagnosis,
  };
}

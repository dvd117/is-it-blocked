import type { BrowserProbeResult, BrowserSignal } from "@/domain/types";

const PROBE_TIMEOUT_MS = 8_000;

export async function probeBrowser(url: string): Promise<BrowserProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const start = performance.now();

  try {
    await fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });

    // no-cors fetch returns opaque response (status 0) on success —
    // the network path exists even though we can't read the response
    const latencyMs = Math.round(performance.now() - start);
    return { signal: "reachable_signal", latencyMs };
  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - start);

    if (error instanceof DOMException && error.name === "AbortError") {
      return { signal: "timeout", latencyMs: null };
    }

    if (error instanceof TypeError) {
      return { signal: "failed_signal", latencyMs };
    }

    return { signal: "inconclusive", latencyMs: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeMultiple(
  urls: string[]
): Promise<{ results: Map<string, BrowserSignal>; failedCount: number }> {
  const results = new Map<string, BrowserSignal>();
  let failedCount = 0;

  const probes = urls.map(async (url) => {
    const result = await probeBrowser(url);
    results.set(url, result.signal);
    if (result.signal === "failed_signal" || result.signal === "timeout") {
      failedCount++;
    }
  });

  await Promise.allSettled(probes);
  return { results, failedCount };
}

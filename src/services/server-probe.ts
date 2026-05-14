import dns from "dns/promises";
import type { ServerProbeResult } from "@/domain/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function probeDomain(domain: string): Promise<ServerProbeResult> {
  let resolvedIps: string[];
  try {
    resolvedIps = await dns.resolve4(domain);
  } catch (error: unknown) {
    return {
      reachable: false,
      dnsResolved: false,
      resolvedIps: [],
      httpStatus: null,
      responseTimeMs: null,
      error: `DNS resolution failed: ${errorMessage(error)}`,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const startTime = Date.now();

  try {
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
    });
    const responseTimeMs = Date.now() - startTime;
    clearTimeout(timeoutId);

    return {
      reachable: true,
      dnsResolved: true,
      resolvedIps,
      httpStatus: response.status,
      responseTimeMs,
      error: null,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (isAbortError(error)) {
      return {
        reachable: false,
        dnsResolved: true,
        resolvedIps,
        httpStatus: null,
        responseTimeMs: null,
        error: "HTTP request timed out after 10s",
      };
    }
    return {
      reachable: false,
      dnsResolved: true,
      resolvedIps,
      httpStatus: null,
      responseTimeMs: null,
      error: `HTTP request failed: ${errorMessage(error)}`,
    };
  }
}

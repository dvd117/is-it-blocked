import dns from "dns/promises";
import type { LookupFunction } from "net";
import { Agent } from "undici";
import type { ServerProbeResult } from "@/domain/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (/^fe[89ab][0-9a-f]?:/.test(normalized)) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true;
  const v4Match = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Match) return isPrivateIpv4(v4Match[1]);
  return false;
}

// Blocks SSRF via attacker-controlled DNS records pointing to internal/link-local ranges.
function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateIpv6(ip) : isPrivateIpv4(ip);
}

async function resolveAll(domain: string): Promise<{ ips: string[]; error: string | null }> {
  const [v4Result, v6Result] = await Promise.allSettled([
    dns.resolve4(domain),
    dns.resolve6(domain),
  ]);
  const v4 = v4Result.status === "fulfilled" ? v4Result.value : [];
  const v6 = v6Result.status === "fulfilled" ? v6Result.value : [];
  const ips = [...v4, ...v6];
  if (ips.length === 0) {
    const reason =
      v4Result.status === "rejected"
        ? errorMessage(v4Result.reason)
        : v6Result.status === "rejected"
          ? errorMessage(v6Result.reason)
          : "no address";
    return { ips: [], error: reason };
  }
  return { ips, error: null };
}

export async function probeDomain(domain: string): Promise<ServerProbeResult> {
  const { ips: resolvedIps, error: dnsError } = await resolveAll(domain);

  if (resolvedIps.length === 0) {
    return {
      reachable: false,
      dnsResolved: false,
      resolvedIps: [],
      httpStatus: null,
      responseTimeMs: null,
      error: `DNS resolution failed: ${dnsError}`,
    };
  }

  if (resolvedIps.some(isPrivateIp)) {
    return {
      reachable: false,
      dnsResolved: false,
      resolvedIps: [],
      httpStatus: null,
      responseTimeMs: null,
      error: "Domain resolves to a private address",
    };
  }

  // Pin a validated IP through the connect lookup so DNS rebinding between
  // validation and fetch cannot redirect the request to a private host.
  const pinnedIp = resolvedIps[0];
  const family = pinnedIp.includes(":") ? 6 : 4;
  const pinnedLookup: LookupFunction = (_hostname, _options, callback) => {
    callback(null, pinnedIp, family);
  };
  const dispatcher = new Agent({
    connect: { lookup: pinnedLookup },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const startTime = Date.now();

  try {
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
      dispatcher,
    } as RequestInit & { dispatcher: Agent });
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
  } finally {
    void dispatcher.close().catch(() => undefined);
  }
}

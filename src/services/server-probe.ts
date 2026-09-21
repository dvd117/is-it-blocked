import dns from "dns/promises";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { Agent } from "undici";
import type { ServerProbeResult } from "@/domain/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function parseIpv4(ip: string): number[] | null {
  const rawParts = ip.split(".");
  if (rawParts.length !== 4 || rawParts.some((part) => !/^\d{1,3}$/.test(part))) {
    return null;
  }
  const parts = rawParts.map(Number);
  if (parts.some((part) => part > 255)) return null;
  return parts;
}

function isPrivateIpv4Parts(parts: readonly number[]): boolean {
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && b >= 18 && b <= 19) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv4(ip: string): boolean {
  const parts = parseIpv4(ip);
  return parts === null ? true : isPrivateIpv4Parts(parts);
}

function isPrivateEmbeddedIpv4(high: number, low: number): boolean {
  return isPrivateIpv4Parts([
    high >> 8,
    high & 0xff,
    low >> 8,
    low & 0xff,
  ]);
}

function parseIpv6(ip: string): number[] | null {
  if (isIP(ip) !== 6) return null;

  const sections = ip.toLowerCase().split("::");
  if (sections.length > 2) return null;

  const parseSection = (section: string): number[] | null => {
    if (!section) return [];
    const parts = section.split(":");
    const groups: number[] = [];
    for (const part of parts) {
      if (part.includes(".")) {
        const ipv4 = parseIpv4(part);
        if (!ipv4 || part !== parts.at(-1)) return null;
        groups.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      groups.push(Number.parseInt(part, 16));
    }
    return groups;
  };

  const head = parseSection(sections[0]);
  const tail = sections.length === 2 ? parseSection(sections[1]) : [];
  if (!head || !tail) return null;

  if (sections.length === 1) {
    return head.length === 8 ? head : null;
  }

  const omitted = 8 - head.length - tail.length;
  return omitted > 0 ? [...head, ...Array.from({ length: omitted }, () => 0), ...tail] : null;
}

function isPrivateIpv6(ip: string): boolean {
  const groups = parseIpv6(ip);
  if (!groups) return true;

  const [first, second, third, fourth, fifth, sixth, seventh, eighth] = groups;
  const allZeroThroughSixth = groups.slice(0, 6).every((group) => group === 0);

  // Unspecified, loopback, IPv4-compatible, and IPv4-mapped addresses.
  if (allZeroThroughSixth) return true;
  if (groups.slice(0, 5).every((group) => group === 0) && sixth === 0xffff) {
    return isPrivateEmbeddedIpv4(seventh, eighth);
  }

  // Unique-local, link-local, deprecated site-local, and multicast ranges.
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80 || (first & 0xffc0) === 0xfec0) return true;
  if ((first & 0xff00) === 0xff00) return true;

  // Documentation addresses are not publicly reachable targets.
  if (first === 0x2001 && second === 0x0db8) return true;

  // Only reject NAT64 and 6to4 addresses when their embedded IPv4 is private.
  if (
    first === 0x0064 &&
    second === 0xff9b &&
    third === 0 &&
    fourth === 0 &&
    fifth === 0 &&
    sixth === 0
  ) {
    return isPrivateEmbeddedIpv4(seventh, eighth);
  }
  if (first === 0x2002) return isPrivateEmbeddedIpv4(second, third);

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
      redirect: "manual",
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

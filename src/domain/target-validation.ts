const INVALID_TARGET_ERROR = "Invalid URL or domain";

const RESERVED_TLDS = new Set([
  "corp",
  "home",
  "internal",
  "invalid",
  "lan",
  "local",
  "localhost",
  "private",
  "test",
]);

type TargetValidationResult =
  | { valid: true; domain: string }
  | { valid: false; error: typeof INVALID_TARGET_ERROR };

function invalid(): TargetValidationResult {
  return { valid: false, error: INVALID_TARGET_ERROR };
}

function stripLeadingWww(hostname: string): string {
  if (!hostname.startsWith("www.")) return hostname;

  const stripped = hostname.slice(4);
  return stripped.includes(".") ? stripped : hostname;
}

function hasUnsafeCharacters(value: string): boolean {
  return /[\s<>"'`{}[\]\\]/.test(value);
}

function isIpv4Address(hostname: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function isPublicLookingHostname(hostname: string): boolean {
  if (
    hostname.length < 4 ||
    hostname.length > 253 ||
    hostname.endsWith(".") ||
    hostname.includes(":") ||
    hostname.includes("[") ||
    hostname.includes("]") ||
    isIpv4Address(hostname)
  ) {
    return false;
  }

  const labels = hostname.split(".");
  if (labels.length < 2) return false;

  const tld = labels.at(-1);
  if (!tld || !/^[a-z]{2,63}$/.test(tld) || RESERVED_TLDS.has(tld)) {
    return false;
  }

  return labels.every((label) => (
    label.length > 0 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ));
}

function extractHostname(value: string): string | null {
  if (value.includes("://")) {
    try {
      const url = new URL(value);
      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return null;
      }

      if (url.username || url.password || url.port) {
        return null;
      }

      return url.hostname;
    } catch {
      return null;
    }
  }

  if (/[/:?#]/.test(value)) {
    return null;
  }

  return value;
}

export function validateTargetInput(input: string): TargetValidationResult {
  const value = input.trim().toLowerCase();

  if (!value || hasUnsafeCharacters(value)) {
    return invalid();
  }

  const hostname = extractHostname(value);
  if (!hostname) {
    return invalid();
  }

  const domain = stripLeadingWww(hostname);
  if (!isPublicLookingHostname(domain)) {
    return invalid();
  }

  return { valid: true, domain };
}

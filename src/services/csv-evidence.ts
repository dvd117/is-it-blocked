import { readFileSync } from "fs";
import path from "path";
import { ISP_NAMES, type CsvEvidence } from "@/domain/types";
import { isRestricted } from "@/domain/isp-status";

function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

// Maps each ISP the app knows about to its column in this file, by header name.
// VE Sin Filtro adds and reorders ISP columns between releases, so a positional
// mapping silently misattributes results the first time that happens.
function ispColumnIndexes(header: string[]): Map<string, number> {
  const normalized = header.map((name) => name.trim().toLowerCase());
  return new Map(
    ISP_NAMES.map((isp) => [isp, normalized.indexOf(isp.toLowerCase())])
  );
}

function buildEvidence(row: string[], ispColumns: Map<string, number>): CsvEvidence | null {
  const [siteName, rawDomain, category] = row;
  const domain = normalizeDomain(rawDomain ?? "");

  if (!siteName || !domain || domain.includes("/")) {
    return null;
  }

  const ispResults: Record<string, string> = {};
  const blockedOnIsps: string[] = [];
  const blockingMethods = new Set<string>();

  ISP_NAMES.forEach((isp) => {
    const column = ispColumns.get(isp) ?? -1;
    const result = column === -1 ? "" : row[column]?.trim() ?? "";
    ispResults[isp] = result;

    if (isRestricted(result)) {
      blockedOnIsps.push(isp);
      blockingMethods.add(result);
    }
  });

  return {
    domain,
    siteName,
    category,
    ispResults,
    blockedOnIsps,
    blockingMethods: Array.from(blockingMethods),
  };
}

export function parseCsv(text: string): CsvEvidence[] {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const ispColumns = ispColumnIndexes(parseCsvLine(headerLine ?? ""));

  return rows
    .map((line) => buildEvidence(parseCsvLine(line), ispColumns))
    .filter((evidence): evidence is CsvEvidence => evidence !== null);
}

function loadEvidence(): CsvEvidence[] {
  const csvPath = path.join(process.cwd(), "data", "blocking-data.csv");
  return parseCsv(readFileSync(csvPath, "utf8"));
}

const evidenceRows = loadEvidence();
const evidenceByDomain = new Map(evidenceRows.map((evidence) => [evidence.domain, evidence]));

export function lookupDomain(domain: string): CsvEvidence | null {
  return evidenceByDomain.get(normalizeDomain(domain)) ?? null;
}

export function getAllDomains(): CsvEvidence[] {
  return [...evidenceRows];
}

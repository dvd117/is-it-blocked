import { readFileSync } from "fs";
import path from "path";
import type { CsvEvidence } from "@/domain/types";

const ISP_NAMES = [
  "CANTV",
  "Movistar",
  "Digitel",
  "Inter",
  "Netuno",
  "Airtek",
  "G-Network",
] as const;

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

function buildEvidence(row: string[]): CsvEvidence | null {
  const [siteName, rawDomain, category, ...ispValues] = row;
  const domain = normalizeDomain(rawDomain ?? "");

  if (!siteName || !domain || domain.includes("/")) {
    return null;
  }

  const ispResults: Record<string, string> = {};
  const blockedOnIsps: string[] = [];
  const blockingMethods = new Set<string>();

  ISP_NAMES.forEach((isp, index) => {
    const result = ispValues[index]?.trim() || "ok";
    ispResults[isp] = result;

    if (result.toLowerCase() !== "ok") {
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

function loadEvidence(): CsvEvidence[] {
  const csvPath = path.join(process.cwd(), "data", "blocking-data.csv");
  const [, ...rows] = readFileSync(csvPath, "utf8").trim().split(/\r?\n/);

  return rows
    .map((line) => buildEvidence(parseCsvLine(line)))
    .filter((evidence): evidence is CsvEvidence => evidence !== null);
}

const evidenceRows = loadEvidence();
const evidenceByDomain = new Map(evidenceRows.map((evidence) => [evidence.domain, evidence]));

export function lookupDomain(domain: string): CsvEvidence | null {
  return evidenceByDomain.get(normalizeDomain(domain)) ?? null;
}

export function getAllDomains(): CsvEvidence[] {
  return [...evidenceRows];
}

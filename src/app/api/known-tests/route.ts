import { NextRequest, NextResponse } from "next/server";
import { lookupDomain } from "@/services/csv-evidence";
import { getComparisonTargets } from "@/services/probe-targets";

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");

  if (!domain || domain.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required parameter: domain" },
      { status: 400 }
    );
  }

  const normalized = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");

  const csvMatch = lookupDomain(normalized);
  const category = csvMatch?.category ?? null;
  const targets = getComparisonTargets(normalized, category ?? undefined);

  return NextResponse.json({ targets, category });
}

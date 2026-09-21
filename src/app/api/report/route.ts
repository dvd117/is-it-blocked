import { NextResponse } from "next/server";
import { saveReport } from "@/services/reports";
import { clientKey, rateLimit } from "@/services/rate-limit";
import { validateTargetInput } from "@/domain/target-validation";
import type { BrowserSignal, DiagnosisVerdict, ReportSubmission } from "@/domain/types";

const VALID_BROWSER_RESULTS: BrowserSignal[] = [
  "reachable_signal",
  "failed_signal",
  "timeout",
  "inconclusive",
];

const VALID_DIAGNOSES: DiagnosisVerdict[] = [
  "very_likely_isp_blocking",
  "likely_isp_blocking",
  "site_may_be_down",
  "inconclusive",
  "likely_not_blocked",
];

const MAX_ISP_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;
const MAX_CREATED_AT_LENGTH = 100;

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  if (!rateLimit(`report:${clientKey(request)}`, 5, 0.083)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let payload: Partial<ReportSubmission> | null;

  try {
    payload = await request.json() as Partial<ReportSubmission> | null;
  } catch {
    return validationError("Invalid report payload");
  }

  if (!payload || typeof payload !== "object") {
    return validationError("Invalid report payload");
  }

  if (typeof payload.domain !== "string" || payload.domain.trim().length === 0) {
    return validationError("Domain is required");
  }

  const domainValidation = validateTargetInput(payload.domain.trim());
  if (!domainValidation.valid) {
    return validationError("Invalid domain");
  }

  if (typeof payload.isp !== "string" || payload.isp.trim().length === 0) {
    return validationError("ISP is required");
  }

  if (payload.isp.length > MAX_ISP_LENGTH) {
    return validationError("ISP name is too long");
  }

  if (payload.manualNotes !== undefined &&
      (typeof payload.manualNotes !== "string" || payload.manualNotes.length > MAX_NOTES_LENGTH)) {
    return validationError("Notes are too long");
  }

  if (
    typeof payload.browserResult !== "string" ||
    !VALID_BROWSER_RESULTS.includes(payload.browserResult as BrowserSignal)
  ) {
    return validationError("Browser result is invalid");
  }

  if (
    typeof payload.diagnosis !== "string" ||
    !VALID_DIAGNOSES.includes(payload.diagnosis as DiagnosisVerdict)
  ) {
    return validationError("Diagnosis is invalid");
  }

  if (
    typeof payload.createdAt !== "string" ||
    payload.createdAt.length === 0 ||
    payload.createdAt.length > MAX_CREATED_AT_LENGTH
  ) {
    return validationError("Created-at value is invalid");
  }

  if (payload.consent !== true) {
    return validationError("Consent is required");
  }

  try {
    await saveReport({
      domain: payload.domain,
      isp: payload.isp,
      browserResult: payload.browserResult,
      diagnosis: payload.diagnosis,
      manualNotes: payload.manualNotes ?? "",
      consent: true,
      createdAt: payload.createdAt,
    } as ReportSubmission);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Consent is required") {
      return validationError(error.message);
    }

    return NextResponse.json(
      { error: "Unable to save report" },
      { status: 500 }
    );
  }
}

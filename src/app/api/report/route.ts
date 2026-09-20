import { NextResponse } from "next/server";
import { saveReport } from "@/services/reports";
import { clientKey, rateLimit } from "@/services/rate-limit";
import { validateTargetInput } from "@/domain/target-validation";
import type { ReportSubmission } from "@/domain/types";

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

  if (payload.isp.length > 200) {
    return validationError("ISP name is too long");
  }

  if (typeof payload.manualNotes === "string" && payload.manualNotes.length > 2000) {
    return validationError("Notes are too long");
  }

  if (payload.consent !== true) {
    return validationError("Consent is required");
  }

  try {
    await saveReport(payload as ReportSubmission);
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

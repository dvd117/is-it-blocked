import { NextResponse } from "next/server";
import { saveReport } from "@/services/reports";
import type { ReportSubmission } from "@/domain/types";

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
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

  if (typeof payload.isp !== "string" || payload.isp.trim().length === 0) {
    return validationError("ISP is required");
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

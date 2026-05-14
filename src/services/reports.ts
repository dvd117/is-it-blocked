import fs from "fs";
import path from "path";
import type { ReportSubmission } from "@/domain/types";

const REPORTS_PATH = path.join(process.cwd(), "data", "reports.jsonl");

export async function saveReport(report: ReportSubmission): Promise<void> {
  if (report.consent !== true) {
    throw new Error("Consent is required");
  }

  const storedReport: ReportSubmission = {
    domain: report.domain,
    isp: report.isp,
    browserResult: report.browserResult,
    diagnosis: report.diagnosis,
    manualNotes: report.manualNotes,
    consent: true,
    createdAt: report.createdAt,
  };

  fs.mkdirSync(path.dirname(REPORTS_PATH), { recursive: true });
  fs.appendFileSync(REPORTS_PATH, `${JSON.stringify(storedReport)}\n`, "utf8");
}

// --- Request/Response ---

export interface CheckRequest {
  url: string;
}

export interface CheckResponse {
  inputUrl: string;
  normalizedDomain: string;
  csvEvidence: CsvEvidence | null;
  ooniEvidence: OoniEvidence | null;
  serverProbe: ServerProbeResult;
  diagnosis: Diagnosis;
}

// --- Evidence Layers ---

export interface CsvEvidence {
  domain: string;
  siteName: string;
  category: string;
  ispResults: Record<string, string>;
  blockedOnIsps: string[];
  blockingMethods: string[];
}

export interface ComparisonTarget {
  domain: string;
  category: string;
  blockedOnIsps: string[];
  blockedIspCount: number;
  blockingMethods: string[];
}

export interface OoniEvidence {
  domain: string;
  recentMeasurements: OoniMeasurement[];
  anomalyCount: number;
  confirmedCount: number;
  totalCount: number;
  lastTested: string | null;
}

export interface OoniMeasurement {
  measurementId: string;
  testName: string;
  input: string;
  probeAsn: string;
  probeCC: string;
  anomaly: boolean;
  confirmed: boolean;
  failure: boolean;
  measurementStartTime: string;
}

export interface ServerProbeResult {
  reachable: boolean;
  httpStatus: number | null;
  dnsResolved: boolean;
  resolvedIps: string[];
  responseTimeMs: number | null;
  error: string | null;
}

// --- Browser Probe (client-side) ---

export type BrowserSignal =
  | "reachable_signal"
  | "failed_signal"
  | "timeout"
  | "inconclusive";

export interface BrowserProbeResult {
  signal: BrowserSignal;
  latencyMs: number | null;
}

// --- Diagnosis ---

export type DiagnosisVerdict =
  | "very_likely_isp_blocking"
  | "likely_isp_blocking"
  | "site_may_be_down"
  | "inconclusive"
  | "likely_not_blocked";

export type DiagnosisConfidence = "high" | "medium" | "low";

export interface Diagnosis {
  verdict: DiagnosisVerdict;
  confidence: DiagnosisConfidence;
  reasoning: string;
  signals: string[];
}

export interface ComparisonEvidence {
  totalProbed: number;
  failedCount: number;
  targets: Array<{ domain: string; blockedIspCount: number }>;
}

// --- Reports ---

export interface ReportSubmission {
  domain: string;
  isp: string;
  browserResult: BrowserSignal;
  diagnosis: DiagnosisVerdict;
  manualNotes: string;
  consent: true;
  createdAt: string;
}

// --- Constants ---

export const ISP_NAMES = [
  "CANTV",
  "Movistar",
  "Digitel",
  "Inter",
  "Netuno",
  "Airtek",
  "G-Network",
] as const;

export type IspName = (typeof ISP_NAMES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  ANON: "VPNs & Anonymization",
  NEWS: "Independent Media",
  POLR: "Political Opposition",
  HUMR: "Human Rights",
  GRP: "Social Media",
  COMM: "Commercial",
  COMT: "Communication Tools",
  ECON: "Economic Data",
  PORN: "Adult Content",
  MMED: "Multimedia",
  HATE: "Hate Speech",
  PUBH: "Public Health",
};

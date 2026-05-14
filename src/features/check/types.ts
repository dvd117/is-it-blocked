import type { BrowserSignal, CheckResponse, ComparisonTarget, Diagnosis } from "@/domain/types";

export type LoadingPhase = "server" | "browser" | "done";

export type RichComparisonTarget = ComparisonTarget;
export type ComparisonResult = { domain: string; signal: BrowserSignal };

export interface PageState {
  loading: boolean;
  comparisonLoading: boolean;
  phase: LoadingPhase | null;
  result: CheckResponse | null;
  browserSignal: BrowserSignal | null;
  comparisonTargets: RichComparisonTarget[];
  comparisonResults?: ComparisonResult[];
  comparisonTotal: number | null;
  comparisonFailed: number | null;
  finalDiagnosis: Diagnosis | null;
  error: string | null;
}

export const initialPageState: PageState = {
  loading: false,
  comparisonLoading: false,
  phase: null,
  result: null,
  browserSignal: null,
  comparisonTargets: [],
  comparisonResults: [],
  comparisonTotal: null,
  comparisonFailed: null,
  finalDiagnosis: null,
  error: null,
};

import type { OoniEvidence, OoniMeasurement } from "@/domain/types";

const OONI_MEASUREMENTS_URL = "https://api.ooni.io/api/v1/measurements";
const CACHE_TTL_MS = 900_000;
const FETCH_TIMEOUT_MS = 10_000;

type OoniApiResult = {
  measurement_uid?: string;
  measurement_id?: string;
  test_name?: string;
  input?: string;
  probe_asn?: string;
  probe_cc?: string;
  anomaly?: boolean;
  confirmed?: boolean;
  failure?: boolean;
  measurement_start_time?: string;
};

type OoniApiResponse = {
  results?: OoniApiResult[];
};

const cache = new Map<string, { data: OoniEvidence; timestamp: number }>();

function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
}

function toMeasurement(result: OoniApiResult): OoniMeasurement {
  return {
    measurementId: result.measurement_uid || result.measurement_id || "",
    testName: result.test_name || "",
    input: result.input || "",
    probeAsn: result.probe_asn || "",
    probeCC: result.probe_cc || "",
    anomaly: result.anomaly === true,
    confirmed: result.confirmed === true,
    failure: result.failure === true,
    measurementStartTime: result.measurement_start_time || "",
  };
}

async function fetchMeasurements(input: string): Promise<OoniMeasurement[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      input,
      probe_cc: "VE",
      limit: "10",
      order_by: "measurement_start_time",
      order: "desc",
    });

    const response = await fetch(`${OONI_MEASUREMENTS_URL}?${params}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OONI API returned ${response.status}`);
    }

    const data = (await response.json()) as OoniApiResponse;
    return (data.results ?? []).map(toMeasurement);
  } finally {
    clearTimeout(timeout);
  }
}

function buildEvidence(domain: string, measurements: OoniMeasurement[]): OoniEvidence {
  return {
    domain,
    recentMeasurements: measurements,
    anomalyCount: measurements.filter((measurement) => measurement.anomaly).length,
    confirmedCount: measurements.filter((measurement) => measurement.confirmed).length,
    totalCount: measurements.length,
    lastTested: measurements[0]?.measurementStartTime || null,
  };
}

export async function queryOoni(domain: string): Promise<OoniEvidence | null> {
  const normalizedDomain = normalizeDomain(domain);
  const cached = cache.get(normalizedDomain);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    let measurements = await fetchMeasurements(`https://${normalizedDomain}`);

    if (measurements.length === 0) {
      measurements = await fetchMeasurements(`http://${normalizedDomain}`);
    }

    const data = buildEvidence(normalizedDomain, measurements);
    cache.set(normalizedDomain, { data, timestamp: now });
    return data;
  } catch (error) {
    console.warn("OONI query failed", error);
    return null;
  }
}

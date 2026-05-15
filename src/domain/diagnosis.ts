import type {
  CsvEvidence,
  OoniEvidence,
  ServerProbeResult,
  BrowserSignal,
  ComparisonEvidence,
  Diagnosis,
  DiagnosisVerdict,
  DiagnosisConfidence,
} from "./types";
import type { Lang } from "@/i18n/messages";

function cleanRestrictionText(value: string): string {
  return value
    .replace(/\bblocked\b/gi, "restricted")
    .replace(/\bblocking\b/gi, "restriction");
}

function formatRestrictionText(value: string, lang: Lang): string {
  if (lang === "es") {
    return value
      .replace(/\bDNS blocking\b/gi, "bloqueo DNS")
      .replace(/\bHTTP blocking\b/gi, "bloqueo HTTP")
      .replace(/\bSNI blocking\b/gi, "bloqueo SNI")
      .replace(/\bblocked\b/gi, "bloqueado")
      .replace(/\bblocking\b/gi, "bloqueo");
  }

  return cleanRestrictionText(value);
}

export interface DiagnosisInput {
  csv: CsvEvidence | null;
  ooni: OoniEvidence | null;
  serverProbe: ServerProbeResult;
  browserSignal: BrowserSignal | null;
  comparison?: ComparisonEvidence | null;
}

function bumpConfidence(confidence: DiagnosisConfidence): DiagnosisConfidence {
  if (confidence === "low") return "medium";
  if (confidence === "medium") return "high";
  return "high";
}

export function diagnose(input: DiagnosisInput, lang: Lang = "en"): Diagnosis {
  const signals: string[] = [];
  const { csv, ooni, serverProbe, browserSignal, comparison } = input;

  const hasCsvMatch = csv !== null && csv.blockedOnIsps.length > 0;
  const hasOoniAnomaly =
    ooni !== null && ooni.totalCount > 0 && ooni.anomalyCount / ooni.totalCount > 0.5;
  const browserFailed =
    browserSignal === "failed_signal" || browserSignal === "timeout";
  const comparisonSupportsFiltering =
    browserFailed &&
    comparison !== null &&
    comparison !== undefined &&
    comparison.totalProbed > 0 &&
    comparison.failedCount / comparison.totalProbed >= 0.5;
  const comparisonWarnsAboutVpnOrDns =
    browserSignal === "reachable_signal" &&
    comparison !== null &&
    comparison !== undefined &&
    comparison.totalProbed > 0 &&
    comparison.failedCount === 0;
  const serverSucceeded = serverProbe.reachable;

  if (hasCsvMatch) {
    const ispCount = csv!.blockedOnIsps.length;
    const methods = csv!.blockingMethods.map((method) => formatRestrictionText(method, lang)).join(", ");
    signals.push(
      lang === "es"
        ? `Documentado en el conjunto de datos de VE Sin Filtro como restringido en ${ispCount} ISP(s) mediante ${methods}`
        : `Documented in VE Sin Filtro dataset as restricted on ${ispCount} ISP(s) via ${methods}`
    );
  }

  if (hasOoniAnomaly) {
    signals.push(
      lang === "es"
        ? `${ooni!.anomalyCount} de ${ooni!.totalCount} mediciones recientes de OONI desde Venezuela muestran anomalías`
        : `${ooni!.anomalyCount} of ${ooni!.totalCount} recent OONI measurements from Venezuela show anomalies`
    );
  }

  if (ooni !== null && ooni.confirmedCount > 0) {
    signals.push(
      lang === "es"
        ? `${ooni.confirmedCount} medición(es) de OONI clasificadas como coincidentes con patrones conocidos de restricción`
        : `${ooni.confirmedCount} OONI measurement(s) classified by OONI as matching known restriction patterns`
    );
  }

  if (browserFailed) {
    const desc =
      browserSignal === "timeout"
        ? lang === "es" ? "agotó el tiempo intentando conectar" : "timed out attempting to connect"
        : lang === "es" ? "no pudo establecer una conexión" : "could not establish a connection";
    signals.push(lang === "es" ? `Tu navegador ${desc}` : `Your browser ${desc}`);
  }

  if (browserSignal === "reachable_signal") {
    signals.push(lang === "es" ? "Tu navegador pudo alcanzar el sitio" : "Your browser was able to reach the site");
  }

  if (serverSucceeded) {
    signals.push(
      lang === "es"
        ? `Nuestro servidor alcanzó el sitio correctamente (HTTP ${serverProbe.httpStatus ?? "desconocido"}, ${serverProbe.responseTimeMs ?? "?"}ms)`
        : `Our server reached the site successfully (HTTP ${serverProbe.httpStatus ?? "unknown"}, ${serverProbe.responseTimeMs ?? "?"}ms)`
    );
  } else {
    signals.push(
      lang === "es"
        ? `Nuestro servidor tampoco pudo alcanzar el sitio: ${serverProbe.error ?? "error desconocido"}`
        : `Our server also could not reach the site: ${serverProbe.error ?? "unknown error"}`
    );
  }

  if (comparisonSupportsFiltering && comparison) {
    signals.push(
      lang === "es"
        ? `${comparison.failedCount} de ${comparison.totalProbed} sitios conocidos como restringidos también fallaron desde tu red, consistente con filtrado a nivel de ISP`
        : `${comparison.failedCount} of ${comparison.totalProbed} known-restricted sites also failed from your network, consistent with ISP-level filtering`
    );
  }

  if (comparisonWarnsAboutVpnOrDns) {
    signals.push(
      lang === "es"
        ? "Sitios conocidos como restringidos también son accesibles desde su red. Es posible que esté usando una VPN, DNS alternativo o un ISP que no restringe este dominio, lo cual podría ocultar el filtrado a nivel de ISP."
        : "Known-restricted sites are also reachable from your network. You may be using a VPN, alternative DNS, or an ISP that does not restrict this domain, which could mask ISP-level filtering."
    );
  }

  const { verdict, confidence: baseConfidence } = resolveVerdict(
    hasCsvMatch,
    hasOoniAnomaly,
    browserFailed,
    serverSucceeded
  );
  const confidence = comparisonSupportsFiltering ? bumpConfidence(baseConfidence) : baseConfidence;

  const reasoning = buildReasoning(
    verdict,
    confidence,
    hasCsvMatch,
    hasOoniAnomaly,
    browserFailed,
    serverSucceeded,
    csv,
    ooni,
    lang,
    comparisonSupportsFiltering && comparison ? comparison : null,
    comparisonWarnsAboutVpnOrDns
  );

  return { verdict, confidence, reasoning, signals };
}

function resolveVerdict(
  hasCsvMatch: boolean,
  hasOoniAnomaly: boolean,
  browserFailed: boolean,
  serverSucceeded: boolean
): { verdict: DiagnosisVerdict; confidence: DiagnosisConfidence } {
  // Server succeeds + browser fails = ISP-level interference pattern
  if (serverSucceeded && browserFailed) {
    if (hasCsvMatch && hasOoniAnomaly) {
      return { verdict: "very_likely_isp_blocking", confidence: "high" };
    }
    if (hasCsvMatch) {
      return { verdict: "very_likely_isp_blocking", confidence: "medium" };
    }
    if (hasOoniAnomaly) {
      return { verdict: "likely_isp_blocking", confidence: "medium" };
    }
    return { verdict: "inconclusive", confidence: "low" };
  }

  // Both server and browser fail = site is probably down
  if (!serverSucceeded && browserFailed) {
    return { verdict: "site_may_be_down", confidence: "medium" };
  }

  // Server succeeds, no browser test yet = partial data
  if (serverSucceeded && !browserFailed) {
    if (hasCsvMatch || hasOoniAnomaly) {
      // Evidence exists but browser did not fail — maybe the user is not on a restricted ISP
      return { verdict: "inconclusive", confidence: "low" };
    }
    return { verdict: "likely_not_blocked", confidence: "medium" };
  }

  return { verdict: "inconclusive", confidence: "low" };
}

function buildReasoning(
  verdict: DiagnosisVerdict,
  confidence: DiagnosisConfidence,
  hasCsvMatch: boolean,
  hasOoniAnomaly: boolean,
  browserFailed: boolean,
  serverSucceeded: boolean,
  csv: CsvEvidence | null,
  ooni: OoniEvidence | null,
  lang: Lang,
  comparison: ComparisonEvidence | null,
  comparisonWarnsAboutVpnOrDns: boolean
): string {
  const comparisonReasoning = (): string => {
    const parts: string[] = [];
    if (comparison) {
      parts.push(
        lang === "es"
          ? `${comparison.failedCount} de ${comparison.totalProbed} sitios conocidos como restringidos también fallaron desde esta red, lo que suma corroboración contextual.`
          : `${comparison.failedCount} of ${comparison.totalProbed} known-restricted sites also failed from this network, adding contextual corroboration.`
      );
    }
    if (comparisonWarnsAboutVpnOrDns) {
      parts.push(
        lang === "es"
          ? "Sitios conocidos como restringidos también son accesibles desde su red. Es posible que esté usando una VPN, DNS alternativo o un ISP que no restringe este dominio, lo cual podría ocultar el filtrado a nivel de ISP."
          : "Known-restricted sites are also reachable from your network. You may be using a VPN, alternative DNS, or an ISP that does not restrict this domain, which could mask ISP-level filtering."
      );
    }
    return parts.join(" ");
  };

  const appendComparisonReasoning = (reasoning: string): string => {
    const extra = comparisonReasoning();
    return extra ? `${reasoning} ${extra}` : reasoning;
  };

  switch (verdict) {
    case "very_likely_isp_blocking": {
      const parts: string[] = [];
      parts.push(
        lang === "es"
          ? "La evidencia coincide con interferencia a nivel de ISP."
          : "The evidence is consistent with ISP-level interference."
      );
      if (serverSucceeded && browserFailed) {
        parts.push(
          lang === "es"
            ? "Nuestro servidor alcanzó este sitio correctamente, pero tu navegador no pudo; eso sugiere que la restricción está entre tu dispositivo y el sitio, posiblemente a nivel de ISP."
            : "Our server reached this site successfully, but your browser could not — suggesting the restriction is between your device and the site, likely at the ISP level."
        );
      }
      if (hasCsvMatch && csv) {
        parts.push(
          lang === "es"
            ? `Este dominio aparece en el conjunto de datos de VE Sin Filtro, documentado como restringido en ${csv.blockedOnIsps.length} ISP venezolano(s).`
            : `This domain appears in the VE Sin Filtro dataset, documented as restricted on ${csv.blockedOnIsps.length} Venezuelan ISP(s).`
        );
      }
      if (hasOoniAnomaly && ooni) {
        parts.push(
          lang === "es"
            ? `Mediciones recientes de OONI desde Venezuela muestran anomalías en ${ooni.anomalyCount} de ${ooni.totalCount} pruebas, algo consistente con filtrado a nivel de red.`
            : `Recent OONI measurements from Venezuela show anomalies in ${ooni.anomalyCount} of ${ooni.totalCount} tests, which is consistent with network-level filtering.`
        );
      }
      return appendComparisonReasoning(parts.join(" "));
    }

    case "likely_isp_blocking": {
      const parts: string[] = [];
      parts.push(
        lang === "es"
          ? "La evidencia disponible sugiere posible interferencia a nivel de ISP, aunque con corroboración limitada."
          : "The available evidence suggests possible ISP-level interference, though with limited corroboration."
      );
      if (serverSucceeded && browserFailed) {
        parts.push(
          lang === "es"
            ? "Nuestro servidor alcanzó este sitio, pero tu navegador no pudo; es un patrón que suele asociarse con filtrado de red."
            : "Our server reached this site, but your browser could not, which is a pattern often associated with network filtering."
        );
      }
      if (hasOoniAnomaly && ooni) {
        parts.push(
          lang === "es"
            ? `Mediciones de OONI desde Venezuela muestran anomalías en ${ooni.anomalyCount} de ${ooni.totalCount} pruebas recientes.`
            : `OONI measurements from Venezuela show anomalies in ${ooni.anomalyCount} of ${ooni.totalCount} recent tests.`
        );
      }
      if (!hasCsvMatch && !hasOoniAnomaly) {
        parts.push(
          lang === "es"
            ? "Este dominio no está en nuestros conjuntos de datos de referencia, así que esta evaluación se basa solo en el comportamiento de red observado."
            : "This domain is not in our reference datasets, so this assessment is based solely on the network behavior we observed."
        );
      }
      return appendComparisonReasoning(parts.join(" "));
    }

    case "site_may_be_down":
      return appendComparisonReasoning(lang === "es"
        ? "Ni nuestro servidor ni tu navegador pudieron alcanzar este sitio. Esto sugiere que el sitio podría estar teniendo problemas propios en vez de interferencia a nivel de ISP, aunque no podemos descartar una interrupción más amplia que afecte su infraestructura."
        : "Both our server and your browser were unable to reach this site. This suggests the site itself may be experiencing issues rather than ISP-level interference — though we cannot rule out a broader disruption affecting the site's infrastructure.");

    case "likely_not_blocked":
      return appendComparisonReasoning(lang === "es"
        ? "Nuestro servidor alcanzó este sitio y no encontramos evidencia de restricciones a nivel de ISP en nuestros conjuntos de datos de referencia. Si estás teniendo problemas para acceder, podrían estar relacionados con la configuración de tu red local y no con filtrado del ISP."
        : "Our server reached this site, and we found no evidence of ISP-level restrictions in our reference datasets. If you are experiencing issues reaching this site, they may be related to your local network configuration rather than ISP filtering.");

    case "inconclusive":
      if (serverSucceeded && browserFailed && !hasCsvMatch && !hasOoniAnomaly) {
        return appendComparisonReasoning(lang === "es"
          ? "Tu navegador no pudo alcanzar este sitio, pero nuestro servidor sí. Sin evidencia corroborada de redes de monitoreo independientes, no podemos determinar si se debe a filtrado a nivel de ISP u otros factores como redirecciones, políticas CORS o restricciones de distribución de contenido. Considera ejecutar los comandos técnicos de verificación de abajo para sumar contexto."
          : "Your browser could not reach this site, but our server could. Without corroborating evidence from independent monitoring networks, we cannot determine whether this is due to ISP-level filtering or other factors such as redirects, CORS policies, or content delivery restrictions. Consider running the technical verification commands below for additional perspective.");
      }
      return appendComparisonReasoning(lang === "es"
        ? "No pudimos llegar a una evaluación clara. Esto puede pasar cuando la evidencia es mixta, las fuentes de datos no están disponibles o el comportamiento de red no coincide claramente con patrones conocidos. Considera ejecutar los comandos técnicos de verificación de abajo para sumar contexto."
        : "We were unable to reach a clear assessment. This may happen when evidence is mixed, data sources are unavailable, or the network behavior does not clearly match known patterns. Consider running the technical verification commands below for additional perspective.");
  }
}

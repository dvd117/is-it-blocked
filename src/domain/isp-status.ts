export type IspStatus = "ok" | "unblocked" | "no_data" | "restricted";

// VE Sin Filtro cell values that are NOT evidence of restriction.
// "unblocked" means a previously documented block was confirmed lifted.
// "ND" ("no data") means the ISP was not measured, which is not a finding.
const NOT_RESTRICTED = new Map<string, IspStatus>([
  ["ok", "ok"],
  ["unblocked", "unblocked"],
  ["nd", "no_data"],
  ["", "no_data"],
]);

export function ispStatus(rawValue: string): IspStatus {
  return NOT_RESTRICTED.get(rawValue.trim().toLowerCase()) ?? "restricted";
}

export function isRestricted(rawValue: string): boolean {
  return ispStatus(rawValue) === "restricted";
}

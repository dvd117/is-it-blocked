export function shouldRunComparisonProbe(hasConsent: boolean, targets: string[]): boolean {
  return hasConsent && targets.length > 0;
}

import type { FxRate, Teacher } from "@/domain/types";

export const teachers: Teacher[] = [
  { id: "t-dav", code: "DAV", name: "David Okafor", category: "native", usdRate: 22 },
  { id: "t-oli", code: "OLI", name: "Oliver Grant", category: "native", usdRate: 23.5 },
  { id: "t-mir", code: "MIR", name: "Mira Novak", category: "non-native", usdRate: 17.5 },
  { id: "t-leo", code: "LEO", name: "Leo Martins", category: "non-native", usdRate: 18 },
  { id: "t-tam", code: "TAM", name: "Tamara Reyes", category: "esl", usdRate: 16 },
  { id: "t-kat", code: "KAT", name: "Katya Orlova", category: "esl", usdRate: 15.5 },
];

/**
 * Bank spot rate captured on the day of calculation. The number itself is
 * mock; the rule is real: VND is always derived from USD via this rate,
 * never stored or hardcoded anywhere.
 */
export function captureFxRate(capturedOn: string): FxRate {
  return { vndPerUsd: 26150, capturedOn, source: "Vietcombank spot" };
}

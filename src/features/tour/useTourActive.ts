"use client";

import { useSearchParams } from "next/navigation";

export function useTourActive(): boolean {
  const searchParams = useSearchParams();
  return searchParams.get("tour") === "1";
}

import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/LandingPage";

export const metadata: Metadata = {
  title: "ClassFlow — Interactive scheduling prototype",
  description:
    "Interactive product prototype for complex education scheduling. Built around real language-school operations — not a launched SaaS.",
};

export default function Home() {
  return <LandingPage />;
}

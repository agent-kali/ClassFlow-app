export interface LandingCopy {
  nav: {
    product: string;
    manager: string;
    teacher: string;
    architecture: string;
    exploreDemo: string;
    openMenu: string;
    closeMenu: string;
    langEn: string;
    langVi: string;
    langGroup: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    honesty: string;
    vignetteLabel: string;
    conflictLabel: string;
    travelLabel: string;
    rateLabel: string;
  };
  problem: {
    headline: string;
    sourceLabel: string;
    canonicalLabel: string;
    fields: {
      teacher: string;
      group: string;
      school: string;
      campus: string;
      time: string;
      duration: string;
      status: string;
      rate: string;
    };
  };
  manager: {
    headline: string;
    steps: [string, string, string, string];
  };
  sync: {
    headline: string;
    changeLabel: string;
    before: string;
    after: string;
    timeline: string;
    status: string;
    earnings: string;
    teacherSchedule: string;
    travelCleared: string;
    travelRisk: string;
    travelOkNote: string;
    travelRiskNote: string;
    payStable: string;
    payTracks: string;
    applyMove: string;
    undoMove: string;
  };
  teacher: {
    headline: string;
    body: string;
    phoneLabel: string;
    earningsLabel: string;
    weekLabel: string;
  };
  rules: {
    headline: string;
    items: string[];
  };
  architecture: {
    headline: string;
    body: string[];
    honesty: string;
  };
  footer: {
    headline: string;
    credit: string;
    role: string;
    managerLink: string;
    teacherLink: string;
  };
  positioning: string;
}

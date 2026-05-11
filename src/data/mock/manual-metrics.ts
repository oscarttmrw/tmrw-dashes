export const mockManualMetrics = {
  unitEconomics: {
    blendedCAC: 95,
    contributionMarginPerMember: 72,
    ltvCacRatio: 3.2,
    cacPaybackMonths: 8,
  },
  clinicalGates: {
    gate2aPassRate: 0.92,
    gate2bPassRate: 0.88,
    gate3PassRate: 0.95,
  },
  outcomes: {
    biomarkerImprovement: 'TBC' as string | number,
    bioAgeDelta: 'TBC' as string | number,
  },
  partnerships: {
    channelPartners: 0,
    corporatePartners: 0,
  },
};

export type ManualMetrics = typeof mockManualMetrics;

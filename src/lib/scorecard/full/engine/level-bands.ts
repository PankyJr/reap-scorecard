export interface LevelBand {
  level: string
  min: number
  maxExclusive?: number
  recognitionPercentage: number
}

export const B_BBEE_LEVEL_BANDS: LevelBand[] = [
  { level: 'Level 1', min: 100, recognitionPercentage: 135 },
  { level: 'Level 2', min: 95, maxExclusive: 100, recognitionPercentage: 125 },
  { level: 'Level 3', min: 90, maxExclusive: 95, recognitionPercentage: 110 },
  { level: 'Level 4', min: 80, maxExclusive: 90, recognitionPercentage: 100 },
  { level: 'Level 5', min: 75, maxExclusive: 80, recognitionPercentage: 80 },
  { level: 'Level 6', min: 70, maxExclusive: 75, recognitionPercentage: 60 },
  { level: 'Level 7', min: 55, maxExclusive: 70, recognitionPercentage: 50 },
  { level: 'Level 8', min: 40, maxExclusive: 55, recognitionPercentage: 10 },
  { level: 'Non-compliant', min: -Infinity, maxExclusive: 40, recognitionPercentage: 0 },
]

export function getLevelBand(score: number | null): LevelBand {
  if (score == null || Number.isNaN(score)) {
    return B_BBEE_LEVEL_BANDS[B_BBEE_LEVEL_BANDS.length - 1]
  }
  for (const band of B_BBEE_LEVEL_BANDS) {
    const minOk = score >= band.min
    const maxOk = band.maxExclusive == null || score < band.maxExclusive
    if (minOk && maxOk) return band
  }
  return B_BBEE_LEVEL_BANDS[B_BBEE_LEVEL_BANDS.length - 1]
}

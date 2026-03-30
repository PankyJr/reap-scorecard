// Types for Scorecard calculation data structures

export interface ScorecardInput {
  ownership: number;
  management_control: number;
  skills_development: number;
  enterprise_development: number;
  socio_economic_development: number;
}

export interface CategoryResult {
  category_key: string;
  category_name: string;
  score: number;
  max_score: number;
}

export interface ScorecardResult {
  total_score: number;
  score_level: string;
  category_results: CategoryResult[];
}

import { LEGACY_SCORECARD_RULES } from './legacyRuleMap'

// Placeholder thresholds mapping are sourced from the centralized rule map.

export function deriveScoreLevel(total_score: number): string {
  let score_level = 'Non-Compliant';
  for (const threshold of LEGACY_SCORECARD_RULES.levelBands) {
    if (total_score >= threshold.min) {
      score_level = threshold.level;
      break;
    }
  }
  return score_level;
}

/**
 * calculateScorecard
 * 
 * Modular calculation engine for the REAP Scorecard System.
 * Currently uses placeholder logic and max values.
 * This can be easily replaced later when final business rules are provided.
 */
export function calculateScorecard(inputs: ScorecardInput): ScorecardResult {
  // Centralized placeholder definitions for categories and maximum possible scores.
  const categories = LEGACY_SCORECARD_RULES.categories.map((cat) => {
    const input =
      cat.key === 'ownership'
        ? inputs.ownership
        : cat.key === 'management_control'
          ? inputs.management_control
          : cat.key === 'skills_development'
            ? inputs.skills_development
            : cat.key === 'enterprise_development'
              ? inputs.enterprise_development
              : cat.key === 'socio_economic_development'
                ? inputs.socio_economic_development
                : 0

    return { ...cat, input }
  })

  const category_results: CategoryResult[] = [];
  let total_score = 0;

  for (const cat of categories) {
    // Basic clamping validation: Make sure raw input doesn't exceed 100 or drop below 0
    let rawInput = Math.max(0, cat.input);
    
    // In this placeholder logic, we'll assume the user enters raw points, 
    // and we'll just cap it at the max score for that category to be safe.
    // Real logic might involve percentages, formulas, etc.
    let calculatedScore = Math.min(rawInput, cat.max_score);
    
    // Round to 2 decimal places
    calculatedScore = Math.round(calculatedScore * 100) / 100;

    total_score += calculatedScore;

    category_results.push({
      category_key: cat.key,
      category_name: cat.name,
      score: calculatedScore,
      max_score: cat.max_score,
    });
  }

  return {
    total_score: Math.round(total_score * 100) / 100,
    score_level: deriveScoreLevel(total_score),
    category_results,
  };
}

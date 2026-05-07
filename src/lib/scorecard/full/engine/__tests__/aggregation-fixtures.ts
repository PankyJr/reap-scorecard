import { validMetricRow } from './fixtures'

const OWN = 'Ownership'
const MC = 'Management Control'

/** Minimal Ownership sheet metrics so `ownership.total` and pillar rollup calculate (shared by aggregation tests). */
export function ownershipMinimalForTotalScore() {
  return [
    validMetricRow({
      metric_key: 'ownership.voting_rights.black_people.percentage',
      numeric_value: 0.25,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.voting_rights.black_people.target',
      numeric_value: 0.5,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.voting_rights.black_people.available_points',
      numeric_value: 4,
      pillar: OWN,
      source_sheet: OWN,
    }),
    validMetricRow({
      metric_key: 'ownership.voting_rights.black_women.percentage',
      numeric_value: 0.1,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.voting_rights.black_women.target',
      numeric_value: 0.2,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.voting_rights.black_women.available_points',
      numeric_value: 4,
      pillar: OWN,
      source_sheet: OWN,
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.black_people.percentage',
      numeric_value: 0.3,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.black_people.target',
      numeric_value: 0.6,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.black_people.available_points',
      numeric_value: 2,
      pillar: OWN,
      source_sheet: OWN,
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.black_women.percentage',
      numeric_value: 0.1,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.black_women.target',
      numeric_value: 0.2,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.black_women.available_points',
      numeric_value: 1,
      pillar: OWN,
      source_sheet: OWN,
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.designated_groups.percentage',
      numeric_value: 0.05,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.designated_groups.target',
      numeric_value: 0.1,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.economic_interest.designated_groups.available_points',
      numeric_value: 1,
      pillar: OWN,
      source_sheet: OWN,
    }),
    validMetricRow({
      metric_key: 'ownership.net_value.percentage',
      numeric_value: 0.2,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.net_value.target',
      numeric_value: 0.4,
      pillar: OWN,
      source_sheet: OWN,
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'ownership.net_value.available_points',
      numeric_value: 3,
      pillar: OWN,
      source_sheet: OWN,
    }),
  ]
}

export function fullBoardRow() {
  return [
    validMetricRow({
      metric_key: 'management_control.board.black_people.percentage',
      numeric_value: 0.5,
      pillar: MC,
      source_sheet: '3 Board Members',
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'management_control.board.black_people.target',
      numeric_value: 0.5,
      pillar: MC,
      source_sheet: '3 Board Members',
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'management_control.board.black_people.available_points',
      numeric_value: 2,
      pillar: MC,
      source_sheet: '3 Board Members',
    }),
    validMetricRow({
      metric_key: 'management_control.board.black_women.percentage',
      numeric_value: 0.1,
      pillar: MC,
      source_sheet: '3 Board Members',
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'management_control.board.black_women.target',
      numeric_value: 0.2,
      pillar: MC,
      source_sheet: '3 Board Members',
      value_type: 'percentage',
    }),
    validMetricRow({
      metric_key: 'management_control.board.black_women.available_points',
      numeric_value: 2,
      pillar: MC,
      source_sheet: '3 Board Members',
    }),
  ]
}

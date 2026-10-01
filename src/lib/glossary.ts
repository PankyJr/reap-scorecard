/**
 * Plain-English meanings for the B-BBEE words the app uses. Shown next to the
 * word wherever it appears (see components/ui/Term.tsx), so someone who is not
 * a B-BBEE specialist can follow every screen. Keep each one to two sentences.
 */
export const GLOSSARY = {
  bbbee: {
    term: 'B-BBEE',
    meaning:
      'Broad-Based Black Economic Empowerment. A government scorecard that measures how much a business contributes to black economic participation; the result is a level from 1 (best) to 8, or Non-compliant.',
  },
  level: {
    term: 'B-BBEE level',
    meaning:
      'The result of a full scorecard, from Level 1 (best) to Level 8, or Non-compliant. A better level means customers can count more of what they spend with this company.',
  },
  fullScorecard: {
    term: 'Full B-BBEE scorecard',
    meaning:
      'Scores all seven elements (ownership, management, skills, procurement, supplier and enterprise development, and socio-economic development) and works out the company’s B-BBEE level.',
  },
  procurementScorecard: {
    term: 'Procurement scorecard',
    meaning:
      'Scores only preferential procurement: how much of the company’s buying goes to B-BBEE suppliers. It is one of the seven elements of the full scorecard, and can be done on its own or attached to a full scorecard.',
  },
  element: {
    term: 'Element',
    meaning:
      'One of the seven scored areas of the full scorecard. Each element has its own points, and the points add up to the total that decides the level.',
  },
  indicator: {
    term: 'Indicator',
    meaning: 'One scored line inside an element, such as “black board members”. Each indicator has a target and points.',
  },
  tmps: {
    term: 'TMPS',
    meaning:
      'Total Measured Procurement Spend: everything the company spent on goods and services in the year that counts for procurement, after allowed exclusions such as salaries. Every procurement percentage is worked out against this number.',
  },
  recognisedSpend: {
    term: 'Recognised spend',
    meaning:
      'Spend with a supplier multiplied by the supplier’s recognition level. For example, R100 with a Level 1 supplier counts as R135.',
  },
  recognitionLevel: {
    term: 'Recognition level',
    meaning:
      'How much of the spend with a supplier counts, based on the supplier’s B-BBEE level: Level 1 counts 135%, Level 4 counts 100%, Level 8 counts 10% and Non-compliant counts nothing.',
  },
  eme: {
    term: 'EME',
    meaning: 'Exempted Micro Enterprise: a business with an annual turnover of R10 million or less.',
  },
  qse: {
    term: 'QSE',
    meaning: 'Qualifying Small Enterprise: a business with an annual turnover above R10 million and up to R50 million.',
  },
  generic: {
    term: 'Generic enterprise',
    meaning:
      'A business with an annual turnover above R50 million. It is measured on the full Generic scorecard with all seven elements.',
  },
  blackOwned: {
    term: '51% black-owned',
    meaning: 'A supplier in which black people hold at least 51% of the ownership.',
  },
  blackWomenOwned: {
    term: '30% black women-owned',
    meaning: 'A supplier in which black women hold at least 30% of the ownership.',
  },
  designatedGroup: {
    term: 'Designated group supplier',
    meaning:
      'A supplier at least 51% owned by black people who are young, disabled, living in rural areas, military veterans or unemployed. Spend with them earns bonus points.',
  },
  flowThrough: {
    term: '51% flow-through',
    meaning:
      'Tick this when the supplier qualifies under the 51% flow-through rule. Its recognised spend is then counted at 1.2 times.',
  },
  npat: {
    term: 'NPAT',
    meaning:
      'Net profit after tax. The targets for enterprise development, supplier development and socio-economic development are a percentage of it.',
  },
  deemedNpat: {
    term: 'Deemed NPAT',
    meaning:
      'A stand-in profit figure used when real profit is low or a loss: revenue × the industry’s normal profit margin × 25%. The higher of real and deemed NPAT is used.',
  },
  leviable: {
    term: 'Leviable amount',
    meaning:
      'The payroll on which the Skills Development Levy is paid. Skills development spending targets are a percentage of it.',
  },
  eap: {
    term: 'EAP',
    meaning:
      'Economically Active Population: the share of working-age South Africans in each race and gender group. Management and skills targets are measured against these shares.',
  },
  subMinimum: {
    term: 'Priority sub-minimum',
    meaning:
      'Ownership, skills development and enterprise and supplier development must each reach 40% of their points. Missing one drops the B-BBEE level by one.',
  },
  discounting: {
    term: 'Discounted level',
    meaning: 'The level is dropped by one because a priority sub-minimum was missed.',
  },
  bonusPoints: {
    term: 'Bonus points',
    meaning: 'Extra points on top of an element’s normal points, for going beyond the basic targets.',
  },
  measurementPeriod: {
    term: 'Measurement period',
    meaning: 'The 12 months the scorecard covers, usually the company’s financial year.',
  },
  workbook: {
    term: 'Workbook',
    meaning:
      'The REAP Generic Scorecard Excel file. Uploading it fills in most of the scorecard for you; you then check and complete what it could not.',
  },
  evidence: {
    term: 'Supporting evidence',
    meaning:
      'Proof that a contribution was made, such as an invoice or signed agreement. A contribution only counts once you confirm the evidence and record its reference.',
  },
  benefitFactor: {
    term: 'Benefit factor',
    meaning:
      'Some contributions, such as loans, count at less than their full value. In this version every contribution counts at 100% of its value.',
  },
  applicability: {
    term: 'Company size and sector',
    meaning:
      'Turnover, sector and start-up status decide which scorecard applies (EME, QSE or Generic) and whether a full level can be produced.',
  },
} as const

export type GlossaryKey = keyof typeof GLOSSARY

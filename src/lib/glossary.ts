/**
 * Plain-English meanings for the B-BBEE words the app uses. Shown next to the
 * word wherever it appears (see components/ui/Term.tsx), so someone who is not
 * a B-BBEE specialist can follow every screen. Keep each meaning to two
 * sentences, plus one realistic example. This is the ONE glossary: the Term
 * tooltip, the help panel and the Help centre all read it.
 */
export const GLOSSARY = {
  bbbee: {
    term: 'B-BBEE',
    meaning:
      'Broad-Based Black Economic Empowerment. A government scorecard that measures how much a business contributes to black economic participation; the result is a level from 1 (best) to 8, or Non-compliant.',
    example:
      'A Level 2 company’s customers can count 125% of what they spend with it towards their own scorecards.',
  },
  level: {
    term: 'B-BBEE level',
    meaning:
      'The result of a full scorecard, from Level 1 (best) to Level 8, or Non-compliant. A better level means customers can count more of what they spend with this company.',
    example:
      '81.69 points is Level 4, which runs from 80 up to 90 points.',
  },
  fullScorecard: {
    term: 'Full B-BBEE scorecard',
    meaning:
      'Scores all seven areas (ownership, management, skills, procurement, supplier and enterprise development, and socio-economic development) and works out the company’s B-BBEE level.',
    example:
      'The points from all seven areas add up to a total, say 81.69 of 109, and the total gives the level.',
  },
  procurementScorecard: {
    term: 'Procurement scorecard',
    meaning:
      'Scores only preferential procurement: how much of the company’s buying goes to B-BBEE suppliers. It is one of the seven areas of the full scorecard, and can be done on its own or attached to a full scorecard.',
    example:
      'Spending most of the year’s purchases with Level 1 and 2 suppliers can earn close to all 25 points.',
  },
  element: {
    term: 'Area',
    meaning:
      'One of the seven scored areas of the full scorecard. The B-BBEE codes call them elements. Each area has its own points, and the points add up to the total that decides the level.',
    example:
      'Ownership, Management control and Skills development are three of the seven areas.',
  },
  indicator: {
    term: 'Indicator',
    meaning: 'One scored line inside an element, such as “black board members”. Each indicator has a target and points.',
    example:
      '“Black board members” is an indicator in Management control, with its own target and points.',
  },
  tmps: {
    term: 'TMPS',
    meaning:
      'Total Measured Procurement Spend: everything the company spent on goods and services in the year that counts for procurement, after allowed exclusions such as salaries. Every procurement percentage is worked out against this number.',
    example:
      'R12 million of purchases less R2 million of allowed exclusions gives a TMPS of R10 million.',
  },
  recognisedSpend: {
    term: 'Recognised spend',
    meaning:
      'Spend with a supplier multiplied by the supplier’s recognition level. For example, R100 with a Level 1 supplier counts as R135.',
    example:
      'R100 with a Level 1 supplier counts as R135; R100 with a Level 8 supplier counts as R10.',
  },
  recognitionLevel: {
    term: 'Recognition level',
    meaning:
      'How much of the spend with a supplier counts, based on the supplier’s B-BBEE level: Level 1 counts 135%, Level 4 counts 100%, Level 8 counts 10% and Non-compliant counts nothing.',
    example:
      'A Level 2 supplier counts at 125%, a Level 6 supplier at 60%.',
  },
  eme: {
    term: 'EME',
    meaning: 'Exempted Micro Enterprise: a business with an annual turnover of R10 million or less.',
    example:
      'A business with R8 million turnover a year is an EME.',
  },
  qse: {
    term: 'QSE',
    meaning: 'Qualifying Small Enterprise: a business with an annual turnover above R10 million and below R50 million.',
    example:
      'A business with R30 million turnover a year is a QSE.',
  },
  generic: {
    term: 'Generic enterprise',
    meaning:
      'A business with an annual turnover of R50 million or more. It is measured on the full Generic scorecard with all seven areas.',
    example:
      'A business with R120 million turnover a year is measured on the Generic scorecard.',
  },
  blackOwned: {
    term: '51% black-owned',
    meaning: 'A supplier in which black people hold at least 51% of the ownership.',
    example:
      'A supplier 60% owned by black people is 51% black-owned.',
  },
  blackWomenOwned: {
    term: '30% black women-owned',
    meaning: 'A supplier in which black women hold at least 30% of the ownership.',
    example:
      'A supplier 35% owned by black women is 30% black women-owned.',
  },
  designatedGroup: {
    term: 'Designated group supplier',
    meaning:
      'A supplier at least 51% owned by black people who are young, disabled, living in rural areas, military veterans or unemployed. Spend with them earns bonus points.',
    example:
      'A supplier 55% owned by young black people is a designated group supplier.',
  },
  flowThrough: {
    term: '51% flow-through',
    meaning:
      'Tick this when the supplier qualifies under the 51% flow-through rule. Its recognised spend is then counted at 1.2 times.',
    example:
      'R100 of recognised spend with such a supplier counts as R120.',
  },
  npat: {
    term: 'NPAT',
    meaning:
      'Net profit after tax. The targets for enterprise development, supplier development and socio-economic development are a percentage of it.',
    example:
      'With R5 million NPAT, the enterprise development target of 1% is R50 000 and the supplier development target of 2% is R100 000.',
  },
  deemedNpat: {
    term: 'Deemed NPAT',
    meaning:
      'A stand-in profit figure used when real profit is low or a loss: revenue × the industry’s normal profit margin × 25%. The higher of real and deemed NPAT is used.',
    example:
      'Revenue of R100 million in an industry with an 8% normal margin gives R100m × 8% × 25% = R2 million deemed NPAT.',
  },
  leviable: {
    term: 'Leviable amount',
    meaning:
      'The payroll on which the Skills Development Levy is paid. Skills development spending targets are a percentage of it.',
    example:
      'With a R20 million leviable amount, the 3.5% target for training spend on black people is R700 000.',
  },
  eap: {
    term: 'EAP',
    meaning:
      'Economically Active Population: the share of working-age South Africans in each race and gender group. Management and skills targets are measured against these shares.',
    example:
      'If black women are a third of the working population, the target for black women managers is measured against that third.',
  },
  subMinimum: {
    term: 'Priority sub-minimum',
    meaning:
      'The three priority elements must each reach 40% of their points (for ownership, 40% of the net value points). Missing one drops the B-BBEE level by one.',
    example:
      'Ownership’s net value is worth 8 points, so at least 3.20 points are needed there.',
  },
  discounting: {
    term: 'Discounted level',
    meaning: 'The level is dropped by one because a priority sub-minimum was missed.',
    example:
      'A company with enough points for Level 4 that misses a sub-minimum ends at Level 5.',
  },
  bonusPoints: {
    term: 'Bonus points',
    meaning: 'Extra points on top of an area’s normal points, for going beyond the basic targets.',
    example:
      'Spend with designated group suppliers can add up to 2 bonus points to procurement.',
  },
  measurementPeriod: {
    term: 'Measurement period',
    meaning: 'The 12 months the scorecard covers, usually the company’s financial year.',
    example:
      '1 March 2025 to 28 February 2026, for a company with a February year end.',
  },
  workbook: {
    term: 'Workbook',
    meaning:
      'The REAP Generic Scorecard Excel file. Uploading it fills in most of the scorecard for you; you then check and complete what it could not.',
    example:
      'Upload the client’s completed REAP Generic Scorecard .xlsx and most figures are filled in for you.',
  },
  evidence: {
    term: 'Supporting evidence',
    meaning:
      'Proof that a contribution was made, such as an invoice or signed agreement. A contribution only counts once you confirm the evidence and record its reference.',
    example:
      'A signed bursary agreement and proof of payment for a skills contribution.',
  },
  benefitFactor: {
    term: 'Benefit factor',
    meaning:
      'Some contributions, such as loans, count at less than their full value. In this version every contribution counts at 100% of its value.',
    example:
      'A R100 000 grant counts as R100 000.',
  },
  applicability: {
    term: 'Company size and sector',
    meaning:
      'Turnover, sector and start-up status decide which scorecard applies (EME, QSE or Generic) and whether a full level can be produced.',
    example:
      'R120 million turnover in the generic sector means the Generic scorecard with all seven areas.',
  },
  priorityElement: {
    term: 'Priority element',
    meaning:
      'Ownership, skills development and enterprise and supplier development. Each has a sub-minimum: missing it drops the level by one.',
    example: 'Skills development is a priority element, so it needs at least 40% of its points.',
  },
  netValue: {
    term: 'Net value',
    meaning:
      'How much of the black shareholders’ stake is truly theirs: the value of their shares after the debt used to buy them is taken off.',
    example: 'Shares worth R10 million with R6 million still owed have a net value of R4 million.',
  },
  esd: {
    term: 'Enterprise and supplier development',
    meaning:
      'The area that covers preferential procurement, supplier development and enterprise development. In the app they are three separate area pages.',
    example: 'Buying from Level 1 suppliers, mentoring a supplier and funding a small business all count here.',
  },
  verification: {
    term: 'Verification agency',
    meaning:
      'An independent agency, accredited by SANAS, that checks a company’s evidence and issues its B-BBEE certificate. The app calculates; it does not verify.',
    example: 'Take the calculated result and its evidence to your verification agency for the certificate.',
  },
  sectorCode: {
    term: 'Sector code',
    meaning:
      'A version of the B-BBEE codes written for one industry, such as construction or financial services. A company in such a sector is measured on its sector code, not the Generic scorecard this app uses.',
    example: 'A building contractor is measured on the Construction sector code.',
  },
  certificate: {
    term: 'B-BBEE certificate',
    meaning:
      'The document that states a company’s B-BBEE level, issued after verification. It has an expiry date; after it, the level on it can no longer be relied on.',
    example: 'A supplier’s certificate says Level 2 and is valid until 30 June 2026.',
  },
  affidavit: {
    term: 'Sworn affidavit',
    meaning:
      'A sworn statement that small businesses (EMEs and QSEs that qualify) can use instead of a verification certificate to show their B-BBEE level.',
    example: 'A small supplier signs an affidavit, before a commissioner of oaths, confirming it is 100% black-owned.',
  },
  seta: {
    term: 'SETA',
    meaning:
      'Sector Education and Training Authority: the body that manages skills levies and approves training plans for an industry.',
    example: 'A manufacturer submits its workplace skills plan to its SETA each year.',
  },
  votingRights: {
    term: 'Voting rights',
    meaning: 'The share of shareholder votes held by black people: who gets a say in how the company is run.',
    example: 'Black shareholders holding 30 of 100 votes have 30% of the voting rights.',
  },
  economicInterest: {
    term: 'Economic interest',
    meaning: 'The share of the company’s profits and dividends that black people are entitled to.',
    example: 'Black shareholders entitled to R3 of every R10 paid out in dividends have 30% economic interest.',
  },
} as const

export type GlossaryKey = keyof typeof GLOSSARY

/**
 * Training nav dropdown and /training page content (from REAP Solutions).
 */

export const trainingCategories = [
  {
    id: 'core-training-programs',
    name: 'Core Training Programs',
    overview:
      'Our core programs give teams a solid grounding in the B-BBEE Codes, ESD, and transformation so they can implement and evidence initiatives with confidence.',
    programs: [
      {
        title: 'Understanding the B-BBEE Codes',
        description:
          'A practical overview of the amended B-BBEE Codes, how scorecards work, and what drives points in real organisations.',
      },
      {
        title: 'Enterprise & Supplier Development Sessions',
        description:
          'Hands-on training on ESD strategy, beneficiary selection, impact tracking, and evidence requirements.',
      },
      {
        title: 'Transformation / Corporate Identity',
        description:
          'Training focused on positioning transformation as a business advantage and embedding it into organisational culture.',
      },
    ],
  },
  {
    id: 'workshops-coaching',
    name: 'Workshops & Coaching',
    overview:
      'Tailored workshops and ongoing coaching to align transformation with your strategy and keep teams on track throughout the year.',
    programs: [
      {
        title: 'Tailor-Made Workshops (Leadership / Teams)',
        description:
          "Custom workshops designed around your organisation's priorities, gaps, and industry context.",
      },
      {
        title: 'Coaching & Enablement',
        description:
          'Ongoing coaching to help teams implement initiatives correctly and maintain momentum throughout the year.',
      },
    ],
  },
]

/** Shape expected by header mega-menu (categories with services array) */
export const trainingDropdown = {
  categories: trainingCategories.map((cat) => ({
    name: cat.name,
    services: cat.programs.map((p) => ({ title: p.title, description: p.description })),
  })),
}

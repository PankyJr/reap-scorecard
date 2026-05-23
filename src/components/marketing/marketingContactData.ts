/** Shared contact details — keep in sync with site header/footer NAP */
export const MARKETING_CONTACT = {
  email: 'tshepom@reapsolutions.co.za',
  phone: '0731401409',
  phoneDisplay: '073 140 1409',
  addressLine1: 'Pretoria, Gauteng',
  addressLine2: 'South Africa',
  hours: 'Mon–Fri, 08:00–17:00',
  mapQuery: 'Pretoria,+South+Africa',
} as const

export const CONTACT_SERVICE_OPTIONS = [
  { value: 'bbbee-strategy', label: 'B-BBEE Strategy & Advisory' },
  { value: 'ownership-advisory', label: 'Ownership Transaction Advisory' },
  { value: 'enterprise-supplier-development', label: 'Enterprise & Supplier Development' },
  { value: 'skills-planning', label: 'Skills Planning & Implementation' },
  { value: 'training', label: 'Training & Coaching' },
  { value: 'scorecard', label: 'REAP Scorecard' },
  { value: 'consultation', label: 'General consultation' },
  { value: 'other', label: 'Other' },
] as const

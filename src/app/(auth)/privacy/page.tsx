import { LegalPageShell, LegalSection } from '../LegalPageShell'

const sections = [
  'Overview',
  'Information we collect',
  'How we use your information',
  'Data storage and security',
  'Your rights',
  'Contact',
]

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your information."
      updatedDate="March 2026"
      sections={sections}
    >
      <LegalSection id="overview" title="Overview">
        <p>
          Reap Solutions (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the REAP Scorecard platform. This policy describes how we collect, use, and protect your information when you use our service.
        </p>
      </LegalSection>

      <LegalSection id="information-we-collect" title="Information we collect">
        <p>
          We collect information you provide directly, including your name, email address, and any data you enter into the platform such as company profiles, scorecard inputs, and procurement assessments.
        </p>
        <p>
          When you sign in with Google, we receive your name, email, and profile picture from your Google account. We do not access your Google contacts, calendar, or other data.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-your-information" title="How we use your information">
        <p>
          We use your information to provide and improve the REAP Scorecard service, authenticate your identity, and communicate with you about your account. We do not sell your personal information to third parties.
        </p>
      </LegalSection>

      <LegalSection id="data-storage-and-security" title="Data storage and security">
        <p>
          Your data is stored securely using Supabase infrastructure with row-level security policies. Access to your data is restricted to your authenticated account. We use industry-standard encryption for data in transit and at rest.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>
          You may request access to, correction of, or deletion of your personal data at any time by contacting us. You can also delete your account, which will remove your data from our active systems.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          If you have questions about this privacy policy, contact us at{' '}
          <a href="mailto:privacy@reapsolutions.co.za" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600">
            privacy@reapsolutions.co.za
          </a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}

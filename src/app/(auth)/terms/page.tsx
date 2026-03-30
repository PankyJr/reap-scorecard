import { LegalPageShell, LegalSection } from '../LegalPageShell'

const sections = [
  'Acceptance of terms',
  'Use of the service',
  'Your data',
  'Acceptable use',
  'Availability and changes',
  'Limitation of liability',
  'Contact',
]

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      subtitle="The rules and guidelines for using the REAP Scorecard platform."
      updatedDate="March 2026"
      sections={sections}
    >
      <LegalSection id="acceptance-of-terms" title="Acceptance of terms">
        <p>
          By accessing or using the REAP Scorecard platform operated by Reap Solutions (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these terms of service. If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection id="use-of-the-service" title="Use of the service">
        <p>
          The REAP Scorecard platform is provided for managing B-BBEE scorecards, procurement assessments, and related business data. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.
        </p>
      </LegalSection>

      <LegalSection id="your-data" title="Your data">
        <p>
          You retain ownership of all data you enter into the platform. We do not claim any intellectual property rights over your content. You grant us a limited licence to store, process, and display your data solely for the purpose of providing the service.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>
          You agree not to misuse the service, including but not limited to: attempting to access other users&apos; data, interfering with the platform&apos;s operation, or using the service for any unlawful purpose.
        </p>
      </LegalSection>

      <LegalSection id="availability-and-changes" title="Availability and changes">
        <p>
          We aim to keep the service available and reliable but do not guarantee uninterrupted access. We may update, modify, or discontinue features at our discretion. Material changes to these terms will be communicated through the platform.
        </p>
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="Limitation of liability">
        <p>
          The service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, Reap Solutions shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          For questions about these terms, contact us at{' '}
          <a href="mailto:legal@reapsolutions.co.za" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600">
            legal@reapsolutions.co.za
          </a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}

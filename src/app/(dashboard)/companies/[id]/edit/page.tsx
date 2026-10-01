import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { updateCompany } from '../actions'
import { NewCompanyForm } from '../../new/NewCompanyForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'

export const metadata = { title: 'Edit company' }

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function EditCompanyPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, owner_id, name, industry, contact_person, email, phone, notes')
    .eq('id', id)
    .single()

  if (!company || company.owner_id !== user.id) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: 'Edit details' },
        ]}
        title="Edit company details"
        description="Changes show on new reports straight away. Saved scores are not affected."
      />
      <Panel>
        <form id="edit-company-form" action={updateCompany}>
          <input type="hidden" name="company_id" value={company.id} />
          <NewCompanyForm
            formId="edit-company-form"
            initialError={error}
            cancelHref={`/companies/${company.id}`}
            cancelLabel="Cancel"
            saveLabel="Save changes"
            initialValues={{
              name: company.name ?? '',
              industry: company.industry ?? '',
              contact_person: company.contact_person ?? '',
              email: company.email ?? '',
              phone: company.phone ?? '',
              notes: company.notes ?? '',
            }}
          />
        </form>
      </Panel>
    </div>
  )
}

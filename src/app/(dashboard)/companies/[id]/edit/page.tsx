import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { updateCompany } from '../actions'
import { NewCompanyForm } from '../../new/NewCompanyForm'

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
    .select('*')
    .eq('id', id)
    .single()

  if (!company || company.owner_id !== user.id) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Link
          href="/companies"
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Back to companies"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Edit Company
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Update details for <span className="font-medium">{company.name}</span>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <form
          id="edit-company-form"
          action={updateCompany}
          className="p-6 md:p-8 space-y-6"
        >
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
      </div>
    </div>
  )
}


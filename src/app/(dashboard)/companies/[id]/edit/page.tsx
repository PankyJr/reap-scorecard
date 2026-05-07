import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Building2, UserRound } from 'lucide-react'
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
    .select('id, owner_id, name, industry, contact_person, email, phone, notes')
    .eq('id', id)
    .single()

  if (!company || company.owner_id !== user.id) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(11,22,61,0.05),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(11,82,89,0.04),transparent_35%),linear-gradient(to_bottom,#f8fafc,#f8fafc)]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_60px_rgba(15,23,42,0.1)]">
          <div className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <Link
                  href="/companies"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Back to companies"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Company profile
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Edit company
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Update details for <span className="font-semibold text-slate-800">{company.name}</span>.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Company</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <Building2 className="h-4 w-4 text-[#0b5259]" />
                    {company.name}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Primary contact</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <UserRound className="h-4 w-4 text-[#0b163d]" />
                    {company.contact_person || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Edit form</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">Company details</h2>
            <p className="mt-1 text-sm text-slate-600">Keep contact and profile details accurate for reporting and follow-up.</p>
          </div>

          <div className="p-5 md:p-7">
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm md:p-6">
              <form
                id="edit-company-form"
                action={updateCompany}
                className="space-y-6"
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
        </section>
      </div>
    </div>
  )
}


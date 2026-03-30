import { createCompany } from './actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewCompanyForm } from './NewCompanyForm'

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/companies" 
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Company</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new client record to track scorecards.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] shadow-sm overflow-hidden">
        <form
          id="new-company-form"
          action={createCompany}
          className="p-6 md:p-8 space-y-6"
        >
          <NewCompanyForm formId="new-company-form" initialError={error} />
        </form>
      </div>
    </div>
  )
}

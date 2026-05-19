import type { Metadata } from 'next'
import { MarketingButton } from '@/components/marketing/ui/button'
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Handshake,
  Sparkles,
  UsersRound,
  MessageCircle,
} from "lucide-react"
import type { ComponentType } from 'react'
import Link from 'next/link'
import { trainingCategories } from '@/components/marketing/training-nav'
import {
  MarketingSubpageHero,
  marketingSubpageHeroHighlightClass,
  marketingSubpageHeroOutlineBtnClass,
  marketingSubpageHeroPrimaryBtnClass,
} from '@/components/marketing/MarketingSubpageHero'

export const metadata: Metadata = {
  title: "Training Programs | B-BBEE Education & Executive Training | REAP Solutions",
  description: "Executive training programs on B-BBEE codes, enterprise supplier development, and transformation strategy. Build transformation capability within your organisation.",
  keywords: "B-BBEE training, transformation training, executive education, B-BBEE codes training, South Africa",
}

export default function TrainingPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow="Training & Education"
        title="Build transformation capability—from the boardroom to implementation."
        description={
          <>
            Executive education programs designed for practitioners and leaders who need to{" "}
            <span className={marketingSubpageHeroHighlightClass()}>understand B-BBEE</span>,{" "}
            <span className={marketingSubpageHeroHighlightClass()}>implement strategies</span>, and{" "}
            <span className={marketingSubpageHeroHighlightClass()}>
              embed transformation into organisational culture
            </span>
            .
          </>
        }
        actions={
          <>
            <MarketingButton asChild className={marketingSubpageHeroPrimaryBtnClass}>
              <Link href="/contact">
                View Programs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
            <MarketingButton asChild variant="outline" className={marketingSubpageHeroOutlineBtnClass}>
              <Link href="/contact">Book a Workshop</Link>
            </MarketingButton>
          </>
        }
      />

      {/* Training sections aligned with navbar: Core Training Programs + Workshops & Coaching */}
      {trainingCategories.map((category) => (
        <section
          key={category.id}
          id={category.id}
          className="relative bg-white"
        >
          <div className="mx-auto w-full px-6 pb-16 pt-16 sm:px-10 lg:px-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[36px]">
                {category.name}
              </h2>
              <Link
                href={`/training#${category.id}-overview`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#05363A] hover:underline"
              >
                See Overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <p
              id={`${category.id}-overview`}
              className="text-slate-600 leading-relaxed mb-10 max-w-3xl scroll-mt-24"
            >
              {category.overview}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.programs.map((program) => {
                const plainCards = [
                  "Understanding the B-BBEE Codes",
                  "Enterprise & Supplier Development Sessions",
                  "Transformation / Corporate Identity",
                  "Tailor-Made Workshops (Leadership / Teams)",
                  "Coaching & Enablement",
                ]
                const isPlainCard = plainCards.includes(program.title)
                const hl = "bg-[#05363A] px-1.5 py-0.5 font-medium text-white"
                const hlYellow = "bg-[#FFCE10] px-1.5 py-0.5 font-medium text-slate-900"

                const programIcons: Record<string, ComponentType<{ className?: string }>> = {
                  "Understanding the B-BBEE Codes": BookOpen,
                  "Enterprise & Supplier Development Sessions": Handshake,
                  "Transformation / Corporate Identity": Sparkles,
                  "Tailor-Made Workshops (Leadership / Teams)": UsersRound,
                  "Coaching & Enablement": MessageCircle,
                }
                const IconComponent = programIcons[program.title] ?? GraduationCap

                return (
                <div
                  key={program.title}
                  className={
                    isPlainCard
                      ? "bg-white p-6 shadow-sm flex flex-col h-full"
                      : "bg-white border-2 border-[#05363A] p-6 shadow-sm hover:bg-[#05363A] hover:border-[#05363A] hover:shadow-md transition-all duration-300 flex flex-col h-full group"
                  }
                >
                  <div className={`h-12 w-12 rounded-none flex items-center justify-center mb-6 ${isPlainCard ? "text-slate-900" : "border-2 border-[#FFCE10] text-[#FFCE10] group-hover:border-white group-hover:text-white group-hover:bg-white/10 transition-colors duration-300"}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className={`text-xl font-bold text-slate-900 mb-3 ${!isPlainCard ? "group-hover:text-white transition-colors duration-300" : ""}`}>
                    {program.title}
                  </h3>
                  {program.title === "Understanding the B-BBEE Codes" && (
                    <p className="text-sm leading-relaxed text-slate-600 mb-6 flex-grow">
                      A practical overview of the <span className={hl}>amended B-BBEE Codes</span>, how <span className={hl}>scorecards</span> work, and what drives <span className={hl}>points</span> in real organisations.
                    </p>
                  )}
                  {program.title === "Enterprise & Supplier Development Sessions" && (
                    <p className="text-sm leading-relaxed text-slate-600 mb-6 flex-grow">
                      Hands-on training on <span className={hl}>ESD strategy</span>, <span className={hl}>beneficiary selection</span>, <span className={hl}>impact tracking</span>, and <span className={hl}>evidence requirements</span>.
                    </p>
                  )}
                  {program.title === "Transformation / Corporate Identity" && (
                    <p className="text-sm leading-relaxed text-slate-600 mb-6 flex-grow">
                      Training focused on positioning <span className={hl}>transformation as a business advantage</span> and embedding it into <span className={hl}>organisational culture</span>.
                    </p>
                  )}
                  {program.title === "Tailor-Made Workshops (Leadership / Teams)" && (
                    <p className="text-sm leading-relaxed text-slate-600 mb-6 flex-grow">
                      Custom workshops designed around your organisation&apos;s <span className={hlYellow}>priorities</span>, <span className={hlYellow}>gaps</span>, and <span className={hlYellow}>industry context</span>.
                    </p>
                  )}
                  {program.title === "Coaching & Enablement" && (
                    <p className="text-sm leading-relaxed text-slate-600 mb-6 flex-grow">
                      Ongoing coaching to help teams <span className={hlYellow}>implement initiatives correctly</span> and <span className={hlYellow}>maintain momentum</span> throughout the year.
                    </p>
                  )}
                  {!isPlainCard && (
                  <p className="text-sm leading-relaxed text-slate-600 group-hover:text-white/90 mb-6 flex-grow transition-colors duration-300">
                    {program.description}
                  </p>
                  )}
                  <Link
                    href="/contact"
                    className={`inline-flex items-center gap-2 text-sm font-semibold text-[#05363A] mt-auto pt-2 ${!isPlainCard ? "group-hover:text-white transition-colors duration-300" : ""}`}
                  >
                    Request Training
                    <ArrowRight className={`h-4 w-4 ${!isPlainCard ? "transition-transform duration-300 group-hover:translate-x-1" : ""}`} />
                  </Link>
                </div>
                )
              })}
            </div>
          </div>
          <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
            <div className="h-px w-full bg-slate-200" />
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="w-full bg-white pt-8 pb-12 md:pt-12 md:pb-20">
        <div className="mx-auto w-full px-6 py-12 sm:py-16 sm:px-10 lg:px-16">
          <div className="border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-10 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(5,54,58,0.35),transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(5,54,58,0.2),transparent_55%)]" />
            </div>

            <div className="relative z-10 grid gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-8">
                <h3 className="text-2xl sm:text-3xl font-bold">
                  Ready to build transformation capability?
                </h3>
                <p className="mt-2 text-white/80 text-base sm:text-lg leading-relaxed">
                  Book a workshop or request custom training tailored to your organisation&apos;s needs.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                <MarketingButton
                  asChild
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 border-0"
                >
                  <Link href="/contact">
                    Book a Workshop <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </MarketingButton>
                <MarketingButton
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/60 text-white bg-white/20 hover:bg-white/30 hover:border-white/80"
                >
                  <Link href="/contact">Request Training</Link>
                </MarketingButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}


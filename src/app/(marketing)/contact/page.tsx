import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/marketing/ui/card'
import { MarketingButton } from '@/components/marketing/ui/button'
import { MarketingContactForm } from '@/components/marketing/MarketingContactForm'
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  MessageCircle,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Contact REAP Solutions | Book a Consult",
  description:
    "Get in touch with REAP Solutions. Book a consult, request a proposal, or ask a question about B-BBEE strategy and transformation support.",
}

const CONTACT = {
  email: "info@reapsolutions.co.za",
  phone: "+27 00 000 0000",
  addressLine1: "Pretoria, Gauteng",
  addressLine2: "South Africa",
  hours: "Mon–Fri, 08:00–17:00",
}

export default function ContactPage() {
  return (
    <>
      {/* Hero - Same format as Solutions / Training */}
      <section className="relative w-full bg-white overflow-hidden">
        <div className="relative z-10 mx-auto w-full px-6 py-20 sm:px-10 sm:py-24 lg:px-16">
          <p className="inline-flex items-center gap-2 text-[#05363A] text-sm sm:text-base mb-4">
            <MessageCircle className="h-4 w-4" />
            Contact
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold leading-tight tracking-tight text-slate-900">
            Let&apos;s talk transformation.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Book a consult, request a proposal, or ask a question. We&apos;ll respond with{" "}
            <span className="bg-[#05363A] px-1.5 py-0.5 font-medium text-white">clear next steps</span>.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <MarketingButton
              asChild
              className="bg-[#05363A] hover:bg-[#05363A]/90 rounded-none font-semibold text-white border-0"
            >
              <a href={`mailto:${CONTACT.email}`}>
                Email us <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </MarketingButton>
            <MarketingButton
              asChild
              variant="outline"
              className="border-2 border-slate-300 text-slate-800 hover:bg-slate-50 rounded-none font-semibold"
            >
              <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>Call us</a>
            </MarketingButton>
          </div>

          <div className="mt-12 h-px w-full bg-slate-200" />
        </div>
      </section>

      {/* Main */}
      <section className="w-full bg-white">
        <div className="mx-auto w-full px-6 py-16 sm:py-20 sm:px-10 lg:px-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left: form */}
            <div className="lg:col-span-7">
              <MarketingContactForm />
            </div>

            {/* Right: contact details + services */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-slate-200 rounded-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900">Contact details</CardTitle>
                  <CardDescription className="text-slate-600 mt-1">
                    Prefer email or phone? Use the options below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-none bg-[#05363A]/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-[#05363A]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</div>
                      <a 
                        className="font-semibold text-slate-900 hover:text-[#05363A] transition-colors" 
                        href={`mailto:${CONTACT.email}`}
                      >
                        {CONTACT.email}
                      </a>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-none bg-[#05363A]/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-[#05363A]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Phone</div>
                      <a 
                        className="font-semibold text-slate-900 hover:text-[#05363A] transition-colors" 
                        href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                      >
                        {CONTACT.phone}
                      </a>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-none bg-[#05363A]/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-[#05363A]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Location</div>
                      <div className="font-semibold text-slate-900">{CONTACT.addressLine1}</div>
                      <div className="text-slate-600 text-sm mt-0.5">{CONTACT.addressLine2}</div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-none bg-[#05363A]/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-[#05363A]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Hours</div>
                      <div className="font-semibold text-slate-900">{CONTACT.hours}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="w-full bg-white border-t border-slate-200">
        <div className="mx-auto w-full px-6 py-12 sm:py-16 sm:px-10 lg:px-16">
          <div>
            {/* Header */}
            <div className="mb-8 sm:mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-none bg-[#05363A]/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-[#05363A]" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Find us</h2>
              </div>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                Located in Pretoria, Gauteng, we&apos;re easily accessible for in-person consultations and meetings.
              </p>
            </div>

            {/* Map Container */}
            <div className="border border-slate-200 rounded-none overflow-hidden">
              <div className="w-full h-[500px] sm:h-[600px]">
                <iframe
                  src="https://www.google.com/maps?q=Pretoria,+South+Africa&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="REAP Solutions Location - Pretoria, South Africa"
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-[#05363A] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Address</div>
                  <div className="font-semibold text-slate-900">{CONTACT.addressLine1}</div>
                  <div className="text-slate-600 text-sm">{CONTACT.addressLine2}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-[#05363A] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Business Hours</div>
                  <div className="font-semibold text-slate-900">{CONTACT.hours}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-[#05363A] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</div>
                  <a 
                    href={`mailto:${CONTACT.email}`}
                    className="font-semibold text-slate-900 hover:text-[#05363A] transition-colors"
                  >
                    {CONTACT.email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

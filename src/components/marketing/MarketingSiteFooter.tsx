"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { MarketingButton } from "@/components/marketing/ui/button"
import { Linkedin, ArrowRight, Twitter, Facebook, Instagram } from "lucide-react"

export function MarketingSiteFooter() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with your API route / provider
      await new Promise((r) => setTimeout(r, 600))
      setEmail("")
      alert("Subscribed successfully!")
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="w-full bg-[#05363A] text-white">
      <div className="mx-auto w-full px-6 py-16 sm:px-10 lg:px-16">
          {/* Top section: Logo, Contact, Newsletter */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left column */}
            <div className="lg:col-span-5 space-y-6">
              {/* Logo */}
              <div className="flex items-center">
                <Image
                  src="/marketing/logo.png"
                  alt="REAP Solutions"
                  width={180}
                  height={48}
                  className="h-10 w-auto object-contain"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>

              {/* Interested text */}
              <p className="text-lg font-medium text-white">
                Interested in REAP Solutions?
              </p>

              {/* Contact button */}
              <div>
                <MarketingButton
                  asChild
                  className="h-11 rounded-none border-2 border-white bg-transparent px-6 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <Link href="/contact">Contact</Link>
                </MarketingButton>
              </div>

              {/* Newsletter signup */}
              <div className="space-y-4">
                <form onSubmit={handleSubscribe} className="flex gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="flex-1 border-b border-white/40 bg-transparent py-2 text-sm text-white placeholder:text-white/60 outline-none focus:border-white"
                  />
                  <MarketingButton
                    type="submit"
                    disabled={loading || !email}
                    variant="outline"
                    className="h-11 rounded-none border-2 border-white/60 bg-transparent px-6 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/80"
                  >
                    <span className="flex items-center">
                      {loading ? "Submitting..." : "Subscribe"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </span>
                  </MarketingButton>
                </form>
                <p className="text-xs text-white/70">
                  Subscribe for updates, news, events, and community resources.
                </p>
              </div>
            </div>

            {/* Right columns: Solutions, Company, Locations */}
            <div className="lg:col-span-7 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {/* Solutions */}
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                  Solutions
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/solutions" className="text-white/80 hover:text-white transition-colors">
                      B-BBEE Strategy
                    </Link>
                  </li>
                  <li>
                    <Link href="/training" className="text-white/80 hover:text-white transition-colors">
                      Training & Coaching
                    </Link>
                  </li>
                  <li>
                    <Link href="/solutions" className="text-white/80 hover:text-white transition-colors">
                      Ownership Advisory
                    </Link>
                  </li>
                  <li>
                    <Link href="/solutions" className="text-white/80 hover:text-white transition-colors">
                      Enterprise & Supplier Development
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                  Company
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/about#team" className="text-white/80 hover:text-white transition-colors">
                      Team
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-white/80 hover:text-white transition-colors">
                      Press
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-white/80 hover:text-white transition-colors">
                      About us
                    </Link>
                  </li>
                  <li>
                    <Link href="/about#partners" className="text-white/80 hover:text-white transition-colors">
                      Partners
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Locations */}
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                  Locations
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <p className="font-medium text-white">South Africa</p>
                    <p className="mt-1 text-white/80">
                      Johannesburg, Gauteng
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal disclaimers */}
          <div className="mt-16 space-y-4 border-t border-white/20 pt-12 text-xs leading-relaxed text-white/70">
            <p>
              B-BBEE transformation advisory and consulting services are provided by REAP Solutions. 
              Information provided on this website is for educational and informational purposes only 
              and does not constitute legal, financial, or professional advice. Access to our services 
              is subject to engagement terms and client eligibility requirements.
            </p>
            <p>
              Clients are advised to carefully review the scope of services, deliverables, timelines, 
              and fees associated with any engagement. Past performance and case studies are provided 
              for illustrative purposes only and do not guarantee similar results. REAP Solutions 
              provides advisory services only and does not provide legal representation or financial 
              investment advice.
            </p>
            <p>
              B-BBEE transformation involves compliance with South African legislation and regulatory 
              requirements. REAP Solutions assists clients in understanding and implementing 
              transformation strategies, but clients are responsible for ensuring compliance with all 
              applicable laws and regulations. All engagements are subject to our Terms of Service, 
              Privacy Policy, and specific engagement agreements.
            </p>
          </div>

          {/* Separation line */}
          <div className="mt-12 border-t border-white/20" />

          {/* Bottom bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <a
                href="https://linkedin.com/company/reap-solutions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/reapsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/reapsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/reapsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <p className="text-xs text-white/80">
                &copy; {new Date().getFullYear()} REAP Solutions. All rights reserved.
              </p>
              <span className="text-xs text-white/60">
                Engineered & Secured by{" "}
                <a
                  href="https://www.infinicolon.co.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors underline"
                >
                  Infini Colon
                </a>
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/80">
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Use
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
      </div>
    </footer>
  )
}

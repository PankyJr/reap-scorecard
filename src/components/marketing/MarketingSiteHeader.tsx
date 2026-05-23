"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Phone,
  Mail,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Linkedin,
  Twitter,
  Facebook,
} from "lucide-react"
import { trainingDropdown } from "@/components/marketing/training-nav"
import {
  marketingMobileNavHeightClass,
  marketingNavHeightClass,
} from "@/components/marketing/marketingLayout"

/**
 * REAP Solutions navbar content updated from company profile:
 * - B-BBEE strategy development
 * - Ownership advisory & analysis
 * - Training & coaching
 * - Skills planning facilitation
 * - Enterprise & Supplier Development
 * Training programs:
 * - Understanding the B-BBEE Codes
 * - ESD Sessions
 * - Transformation/Corporate Identity
 */

const navigationItems = [
  { name: "HOME", href: "/" },
  { name: "ABOUT", href: "/about" },
  { name: "SOLUTIONS", href: "/solutions", hasDropdown: true },
  { name: "REAP SCORECARD", href: "/scorecard" },
  { name: "TRAINING", href: "/training", hasDropdown: true },
  { name: "CONTACT", href: "/contact" },
]

const socialItems = [
  { label: "LinkedIn", link: "https://linkedin.com/company/reap-solutions", Icon: Linkedin },
  { label: "Twitter", link: "https://twitter.com/reapsolutions", Icon: Twitter },
  { label: "Facebook", link: "https://facebook.com/reapsolutions", Icon: Facebook },
]

/** SOLUTIONS dropdown (core offering) */
const solutionsDropdown = {
  categories: [
    {
      name: "B-BBEE Strategy & Advisory",
      services: [
        {
          title: "B-BBEE Strategy Development",
          description:
            "Translate your business strategy into a commercially sound transformation model with measurable outcomes for internal and external stakeholders.",
        },
        {
          title: "Transformation Roadmap & Implementation Support",
          description:
            "Practical, phased implementation guidance to close gaps and sustain B-BBEE performance over time.",
        },
        {
          title: "Ongoing Advisory Support",
          description:
            "On-demand advisory to interpret codes, align initiatives, and maintain compliance confidence across the year.",
        },
      ],
    },
    {
      name: "Ownership Transaction Advisory",
      services: [
        {
          title: "Advisory on Ownership Transactions",
          description:
            "Specialist support on structuring ownership transactions aligned to B-BBEE objectives and commercial realities.",
        },
        {
          title: "Shareholder Profile & Partner Identification",
          description:
            "Define the ideal B-BBEE partner profile (industry specialists, market access partners, or capital providers) to unlock real value.",
        },
        {
          title: "Funding Model Advisory",
          description:
            "Advise on fit-for-purpose funding structures to optimize B-BBEE ownership outcomes while remaining commercially viable.",
        },
        {
          title: "Tax, Accounting & Legal Advisory (Associates)",
          description:
            "Access specialist associates (tax/legal/accounting) to ensure decisions are grounded in sound technical principles.",
        },
      ],
    },
    {
      name: "Enterprise & Supplier Development",
      services: [
        {
          title: "ESD Strategy & Solutions",
          description:
            "Design and implement ESD initiatives that strengthen supplier pipelines and improve scorecard outcomes sustainably.",
        },
        {
          title: "Supplier Development Planning",
          description:
            "Identify opportunities, structure support, and measure impact to maximize both commercial and transformation value.",
        },
        {
          title: "Enterprise Development Enablement",
          description:
            "Support enterprise development initiatives with governance, tracking, and practical execution guidance.",
        },
      ],
    },
    {
      name: "Skills Planning & Implementation",
      services: [
        {
          title: "Skills Planning Facilitation",
          description:
            "Facilitate skills planning aligned to B-BBEE priorities, ensuring initiatives are actionable and auditable.",
        },
        {
          title: "Implementation & Evidence Readiness",
          description:
            "Support execution and documentation readiness to ensure initiatives can be substantiated during reviews and engagements.",
        },
        {
          title: "Coaching for Internal Teams",
          description:
            "Upskill internal stakeholders with role-specific guidance to run transformation initiatives effectively.",
        },
      ],
    },
  ],
}

export function MarketingSiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mobileNavLevel, setMobileNavLevel] = useState<"main" | "solutions" | "training">("main")
  const [mobileNavSubLevel, setMobileNavSubLevel] = useState<string | null>(null)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolled(currentScrollY > 10)
      
      // Hide banner when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setBannerVisible(false)
      } else {
        setBannerVisible(true)
      }
      setLastScrollY(currentScrollY)
    }
    
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

  /** Dropdown data router */
  const getDropdownData = (dropdownType: string) => {
    if (dropdownType === "SOLUTIONS") return solutionsDropdown
    if (dropdownType === "TRAINING") return trainingDropdown
    return solutionsDropdown
  }

  return (
    <>
      {/* Sticky Banner - Above Navbar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 hidden w-full border-b border-white/10 bg-black transition-transform duration-300 lg:block ${
          bannerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-8 sm:h-10 items-center justify-between text-xs sm:text-sm font-light text-white">
          {/* Services - Responsive display */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-6 min-w-0 flex-1">
            {/* Small screens: show 1-2 services */}
            <div className="hidden sm:flex md:hidden items-center gap-1.5 min-w-0">
              <span className="whitespace-nowrap text-[10px] truncate">B-BBEE Strategy</span>
              <span className="text-white/50 flex-shrink-0">|</span>
              <span className="whitespace-nowrap text-[10px] truncate">Ownership Advisory</span>
            </div>

            {/* Medium screens: show 3 services */}
            <div className="hidden md:flex lg:hidden items-center gap-2 min-w-0">
              {["B-BBEE Strategy Development", "Ownership Advisory", "Training & Coaching"].map((service, index) => (
                <React.Fragment key={service}>
                  <span className="whitespace-nowrap text-xs truncate transition-all duration-200 hover:text-emerald-400">
                    {service.length > 25 ? `${service.substring(0, 22)}...` : service}
                  </span>
                  {index < 2 && <span className="text-white/50 flex-shrink-0">|</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Large screens: show all services */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4 min-w-0">
              {["B-BBEE Strategy Development", "Ownership Advisory", "Ownership Analysis", "Training & Coaching", "Skills Planning Facilitation", "Enterprise & Supplier Development"].map((service, index, arr) => (
                <React.Fragment key={service}>
                  <span className="whitespace-nowrap text-xs xl:text-sm truncate transition-all duration-200 hover:text-emerald-400 cursor-pointer">
                    {service}
                  </span>
                  {index < arr.length - 1 && <span className="text-white/50 flex-shrink-0">|</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-shrink-0 ml-2 sm:ml-4">
            {/* Phone */}
            <div className="flex items-center gap-1 sm:gap-1.5 group cursor-pointer">
              <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 transition-all duration-200 group-hover:text-emerald-400" />
              <span className="text-[10px] xs:text-xs sm:text-sm whitespace-nowrap transition-all duration-200 group-hover:text-emerald-400">
                073 140 1409
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center gap-1 sm:gap-1.5 group cursor-pointer">
              <Mail className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 transition-all duration-200 group-hover:text-emerald-400" />
              <span className="text-[10px] xs:text-xs sm:text-sm whitespace-nowrap transition-all duration-200 group-hover:text-emerald-400">
                <span className="hidden lg:inline">tshepom@reapsolutions.co.za</span>
                <span className="lg:hidden max-w-[100px] sm:max-w-[130px] md:max-w-[160px] truncate">
                  tshepom@reap...
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header
        className={`sticky top-0 z-50 w-full border-b bg-white transition-all duration-300 ${
          bannerVisible ? "lg:top-10" : "lg:top-0"
        } ${
          isScrolled
            ? "border-slate-200/80 bg-white/95 shadow-md backdrop-blur-md"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto w-full px-5 lg:px-8">
          {/* Desktop */}
          <div className={`hidden lg:flex ${marketingNavHeightClass} items-center justify-between gap-6`}>
          <Link href="/" className="flex flex-shrink-0 items-center group transition-all duration-300 group-hover:scale-105">
            <span className="relative block h-12 w-44 shrink-0">
              <Image
                src="/marketing/reap-solutions-logo.png"
                alt="REAP Solutions"
                fill
                className="object-contain object-left"
                sizes="176px"
                priority
              />
            </span>
          </Link>

          <nav className="relative flex items-center space-x-4 xl:space-x-6">
            {navigationItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => {
                  setHoveredItem(item.name)
                  if (item.hasDropdown) {
                    setActiveDropdown(item.name)
                    const dropdownData = getDropdownData(item.name)
                    setActiveCategory(dropdownData.categories[0].name)
                  }
                }}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href={item.href}
                  className={`flex items-center space-x-1 text-sm font-medium transition-all duration-300 relative group ${
                    isActive(item.href)
                      ? "text-emerald-600"
                      : "text-slate-600 hover:text-emerald-600"
                  }`}
                >
                  <span className="relative z-10 transition-all duration-300 group-hover:scale-105">
                    {item.name}
                  </span>
                  {item.hasDropdown && (
                    <ChevronDown
                      className={`h-3 w-3 transition-all duration-300 ${
                        hoveredItem === item.name ? "rotate-180 text-emerald-600" : ""
                      }`}
                    />
                  )}
                </Link>
              </div>
            ))}
          </nav>

          <div className="flex flex-shrink-0 items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
            >
              Client Login
            </Link>
            <Link
              href="/contact"
              className="border-2 border-[#05363A] bg-[#05363A] px-4 py-2 text-sm font-medium text-white transition duration-200 hover:border-[#064a50] hover:bg-[#064a50]"
            >
              Book Demo
            </Link>
          </div>
          </div>

          {/* Mobile — logo + menu */}
          <div
            className={`relative flex ${marketingMobileNavHeightClass} items-center justify-between lg:hidden`}
          >
            <Link href="/" className="relative z-10 flex shrink-0 items-center">
              <span className="relative block h-8 w-[4.75rem]">
                <Image
                  src="/marketing/reap-solutions-logo.png"
                  alt="REAP Solutions"
                  fill
                  className="object-contain object-left"
                  sizes="76px"
                  priority
                />
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center text-slate-900 transition-colors hover:text-[#05363A]"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>

      {/* Full-Width Mega Dropdown */}
      {activeDropdown && (
        <div
          className="absolute top-full left-0 w-full bg-white border-t border-slate-200 shadow-xl z-40 transition-all duration-300"
          onMouseLeave={() => {
            setActiveDropdown(null)
            setActiveCategory(null)
          }}
        >
          <div className="absolute -top-4 left-0 w-full h-4 bg-transparent"></div>

          <div className="w-full">
            <div className="flex h-[500px]">
              {/* Left Menu */}
              <div className="w-1/3 bg-slate-100 border-r border-slate-200 pl-6">
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    {activeDropdown}
                  </h3>
                  <div className="space-y-1">
                    {getDropdownData(activeDropdown).categories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        className={`w-full text-left px-3 py-2 border-2 text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                          activeCategory === category.name
                            ? "bg-black text-white border-black"
                            : "text-slate-600 bg-transparent border-slate-300 hover:text-slate-900 hover:border-slate-900"
                        }`}
                      >
                        <span>{category.name}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Content */}
              <div className="flex-1 p-6 overflow-y-auto pr-20">
                {activeCategory && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-semibold text-slate-900">{activeCategory}</h4>
                      <Link
                        href={activeDropdown === "SOLUTIONS" ? "/solutions" : "/training"}
                        className="text-sm text-black hover:text-slate-700 flex items-center gap-1 transition-colors duration-200"
                      >
                        See Overview <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {getDropdownData(activeDropdown).categories
                        .find((cat) => cat.name === activeCategory)
                        ?.services.map((service, index) => (
              <Link
                            key={service.title}
                            href={activeDropdown === "SOLUTIONS" ? "/solutions" : "/training"}
                            className="block p-4 border-2 border-slate-200 hover:border-slate-900 transition-all duration-200 cursor-pointer group"
                            style={{
                              animationDelay: `${index * 50}ms`,
                              animation: "fadeInUp 0.3s ease-out forwards",
                            }}
                          >
                            <h5 className="font-semibold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors duration-200">
                              {service.title}
                            </h5>
                            <p className="text-sm text-slate-600 leading-relaxed">{service.description}</p>
                          </Link>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu - portal so it works at any scroll position */}
      {isMobileMenuOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-white pt-[env(safe-area-inset-top,0px)] lg:hidden">
          {/* In-menu header: logo + close */}
          <div
            className={`flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 ${marketingMobileNavHeightClass}`}
          >
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
              <span className="relative block h-8 w-[4.75rem] shrink-0">
                <Image
                  src="/marketing/reap-solutions-logo.png"
                  alt="REAP Solutions"
                  fill
                  className="object-contain object-left"
                  sizes="76px"
                />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false)
                setMobileNavLevel("main")
                setMobileNavSubLevel(null)
              }}
              className="flex h-10 w-10 items-center justify-center text-slate-900 transition-colors hover:text-[#05363A]"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          {mobileNavLevel !== "main" && (
            <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  if (mobileNavSubLevel) setMobileNavSubLevel(null)
                  else setMobileNavLevel("main")
                }}
                className="flex items-center gap-1 text-sm font-medium text-[#05363A]"
              >
                <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
                {mobileNavSubLevel ? `BACK TO ${mobileNavLevel.toUpperCase()}` : "BACK TO HOME"}
              </button>
            </div>
          )}

          {mobileNavLevel === "main" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <nav className="space-y-0">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                >
                  HOME
                </Link>
                <Link
                  href="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                >
                  ABOUT
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavLevel("solutions")}
                  className="flex w-full items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                >
                  <span>SOLUTIONS</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <Link
                  href="/scorecard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                >
                  REAP SCORECARD
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavLevel("training")}
                  className="flex w-full items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                >
                  <span>TRAINING</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                >
                  CONTACT
                </Link>
              </nav>
              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full rounded-none border-2 border-slate-300 bg-white py-3.5 text-center font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Client Login
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full rounded-none border-2 border-[#05363A] bg-[#05363A] py-3.5 text-center font-semibold text-white transition-colors hover:bg-[#064a50]"
                >
                  Book Demo
                </Link>
              </div>
            </div>
          )}

          {mobileNavLevel === "solutions" && !mobileNavSubLevel && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-slate-900">Solutions</h2>
                <div className="h-1 w-8 bg-[#05363A]" />
              </div>
              <nav className="space-y-0">
                {solutionsDropdown.categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setMobileNavSubLevel(category.name)}
                    className="flex w-full items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                  >
                    <span>{category.name}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                ))}
              </nav>
            </div>
          )}

          {mobileNavLevel === "solutions" && mobileNavSubLevel && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-slate-900">{mobileNavSubLevel}</h2>
                <div className="h-1 w-8 bg-[#05363A]" />
              </div>
              <nav className="space-y-0">
                {solutionsDropdown.categories
                  .find((c) => c.name === mobileNavSubLevel)
                  ?.services.map((service) => (
                    <Link
                      key={service.title}
                      href="/solutions"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block border-b border-slate-100 py-3 text-slate-700 transition-colors hover:text-[#05363A]"
                    >
                      {service.title}
                    </Link>
                  ))}
              </nav>
            </div>
          )}

          {mobileNavLevel === "training" && !mobileNavSubLevel && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-slate-900">Training</h2>
                <div className="h-1 w-8 bg-[#05363A]" />
              </div>
              <nav className="space-y-0">
                {trainingDropdown.categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setMobileNavSubLevel(category.name)}
                    className="flex w-full items-center justify-between border-b border-slate-100 py-4 text-lg font-semibold text-slate-900"
                  >
                    <span>{category.name}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                ))}
              </nav>
            </div>
          )}

          {mobileNavLevel === "training" && mobileNavSubLevel && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-slate-900">{mobileNavSubLevel}</h2>
                <div className="h-1 w-8 bg-[#05363A]" />
              </div>
              <nav className="space-y-0">
                {trainingDropdown.categories
                  .find((c) => c.name === mobileNavSubLevel)
                  ?.services.map((service) => (
                    <Link
                      key={service.title}
                      href="/training"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block border-b border-slate-100 py-3 text-slate-700 transition-colors hover:text-[#05363A]"
                    >
                      {service.title}
                    </Link>
                  ))}
              </nav>
            </div>
          )}

          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div className="flex flex-col gap-1">
                <a
                  href="tel:0731401409"
                  className="flex items-center gap-2 transition-colors hover:text-[#05363A]"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  073 140 1409
                </a>
                <a
                  href="mailto:tshepom@reapsolutions.co.za"
                  className="flex max-w-[200px] items-center gap-2 truncate transition-colors hover:text-[#05363A]"
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                  <span className="truncate">tshepom@reapsolutions.co.za</span>
                </a>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                {socialItems.map((social) => {
                  const Icon = social.Icon
                  return (
                    <a
                      key={social.label}
                      href={social.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-2 transition-colors hover:bg-slate-200/80 hover:text-[#05363A]"
                      aria-label={social.label}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </header>
    </>
  )
}

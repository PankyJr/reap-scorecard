import { Inter } from 'next/font/google'
import { MarketingSiteFooter } from '@/components/marketing/MarketingSiteFooter'
import { MarketingSiteHeader } from '@/components/marketing/MarketingSiteHeader'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} text-slate-900 antialiased`}>
      <div className="flex min-h-screen flex-col bg-white">
        <MarketingSiteHeader />
        <main className="flex-1 pt-8 sm:pt-10">{children}</main>
        <MarketingSiteFooter />
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import { AberdareLiveProcurementApp } from '@/components/clients/aberdare/AberdareLiveProcurementApp'

export const metadata: Metadata = {
  title: 'Aberdare Live Procurement',
  robots: { index: false, follow: false },
}

export default function AberdareLiveProcurementPage() {
  return <AberdareLiveProcurementApp />
}

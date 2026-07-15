import type { Metadata } from 'next'
import { ProcurementSimulatorApp } from '@/components/procurement-simulator/ProcurementSimulatorApp'

export const metadata: Metadata = {
  title: 'Procurement Scenario Planner (Prototype)',
  robots: { index: false, follow: false },
}

export default function ProcurementSimulatorPreviewPage() {
  return <ProcurementSimulatorApp />
}

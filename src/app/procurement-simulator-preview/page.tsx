import type { Metadata } from 'next'
import { ProcurementSimulatorApp } from '@/components/procurement-simulator/ProcurementSimulatorApp'
import { notFoundOnDemo } from '@/lib/demo/demoRouteGuards'

export const metadata: Metadata = {
  title: 'Procurement Scenario Planner (Prototype)',
  robots: { index: false, follow: false },
}

export default function ProcurementSimulatorPreviewPage() {
  // The demo build is the system only: this page does not exist there.
  notFoundOnDemo()

  return <ProcurementSimulatorApp />
}

import { ObservatoryShell } from '@/components/observatory/shell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ObservatoryShell>{children}</ObservatoryShell>
}

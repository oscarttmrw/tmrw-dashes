import { AppShell } from '@/components/layout/app-shell'
import { FilterProvider } from '@/lib/context/filter-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <AppShell>{children}</AppShell>
    </FilterProvider>
  )
}

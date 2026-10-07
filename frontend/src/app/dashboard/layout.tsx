import { DashboardShell } from "@/components/dashboard-shell";

// Private, client-rendered area behind a session: nothing to prerender, so skip
// Cache Components' instant-navigation / static-shell validation for it.
export const instant = false;

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardShell>{children}</DashboardShell>;
}

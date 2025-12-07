import type { ReactNode } from "react";
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard";

export default function ProducerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardAuthGuard>{children}</DashboardAuthGuard>;
}

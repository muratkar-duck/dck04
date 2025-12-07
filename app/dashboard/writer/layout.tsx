import type { ReactNode } from "react";
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard";

export default function WriterDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardAuthGuard allowedRoles={["writer"]}>{children}</DashboardAuthGuard>;
}

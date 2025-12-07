"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";
import { type UserRole, getDashboardPathForRole } from "@/lib/authHelpers";

type DashboardAuthGuardProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

const resolveRoleFromUser = (user: User | null): UserRole => {
  const rawRole = (user?.user_metadata?.role as string | undefined) || "writer";
  if (rawRole === "producer") return "producer";
  return "writer";
};

export function DashboardAuthGuard({ children, allowedRoles }: DashboardAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = getBrowserSupabaseClient();

      if (!supabase) {
        router.replace("/auth/sign-in?redirect=" + encodeURIComponent(pathname));
        setChecking(false);
        setIsAuthed(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      if (error || !user) {
        router.replace("/auth/sign-in?redirect=" + encodeURIComponent(pathname));
        setChecking(false);
        setIsAuthed(false);
        return;
      }

      const role = resolveRoleFromUser(user);

      if (!allowedRoles || allowedRoles.length === 0) {
        setIsAuthed(true);
        setChecking(false);
        return;
      }

      if (!allowedRoles.includes(role)) {
        const target = getDashboardPathForRole(role) ?? "/";
        router.replace(target);
        setChecking(false);
        setIsAuthed(false);
        return;
      }

      setIsAuthed(true);
      setChecking(false);
    };

    void run();
  }, [router, pathname, allowedRoles]);

  if (checking) {
    return (
      <div className="flex w-full justify-center py-12 text-slate-300">
        Oturum kontrol ediliyor…
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}

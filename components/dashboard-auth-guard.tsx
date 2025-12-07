"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  type UserRole,
  getDashboardPathForRole,
  syncUserProfileAndRole,
} from "@/lib/authHelpers";

type DashboardAuthGuardProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
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
        router.replace(
          "/auth/sign-in?redirect=" + encodeURIComponent(pathname)
        );
        setChecking(false);
        setIsAuthed(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (error || !user) {
        router.replace(
          "/auth/sign-in?redirect=" + encodeURIComponent(pathname)
        );
        setChecking(false);
        setIsAuthed(false);
        return;
      }

      let resolvedRole: UserRole | undefined;
      try {
        resolvedRole = await syncUserProfileAndRole(supabase, user);
      } catch (roleError) {
        console.error("DashboardAuthGuard role resolve hatası:", roleError);
      }

      if (!allowedRoles || !allowedRoles.length) {
        setIsAuthed(true);
        setChecking(false);
        return;
      }

      if (!resolvedRole) {
        const fallbackTarget = "/";
        router.replace(fallbackTarget);
        setChecking(false);
        setIsAuthed(false);
        return;
      }

      if (!allowedRoles.includes(resolvedRole)) {
        const redirectTarget = getDashboardPathForRole(resolvedRole) ?? "/";
        router.replace(redirectTarget);
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

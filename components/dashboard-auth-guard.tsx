"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { roleRedirectMap, type UserRole } from "@/lib/authHelpers";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

type DashboardAuthGuardProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function DashboardAuthGuard({
  children,
  allowedRoles,
}: DashboardAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const redirectToSignIn = () => {
      const redirectUrl = `/auth/sign-in?redirect=${encodeURIComponent(pathname || "/")}`;
      router.replace(redirectUrl);
    };

    if (!supabase) {
      redirectToSignIn();
      setChecking(false);
      return;
    }

    const checkSession = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setIsAuthed(false);
        redirectToSignIn();
        setChecking(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setIsAuthed(false);
        router.replace("/");
        setChecking(false);
        return;
      }

      const userRole = profile.role as UserRole;

      if (allowedRoles && !allowedRoles.includes(userRole)) {
        const redirectTarget = roleRedirectMap[userRole] ?? "/";
        router.replace(redirectTarget);
        setIsAuthed(false);
        setChecking(false);
        return;
      }

      setIsAuthed(true);
      setChecking(false);
    };

    void checkSession();
  }, [allowedRoles, pathname, router]);

  if (checking) {
    return (
      <div className="flex w-full justify-center py-12 text-slate-300">Oturum kontrol ediliyor…</div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}

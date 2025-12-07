"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

interface DashboardAuthGuardProps {
  children: ReactNode;
}

export function DashboardAuthGuard({ children }: DashboardAuthGuardProps) {
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
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setIsAuthed(false);
        redirectToSignIn();
        setChecking(false);
        return;
      }

      setIsAuthed(true);
      setChecking(false);
    };

    void checkSession();
  }, [pathname, router]);

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

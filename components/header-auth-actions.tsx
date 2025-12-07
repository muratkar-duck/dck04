"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";
import { SignOutButton } from "@/components/sign-out-button";

export function HeaderAuthActions() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setHasSession(false);
      return;
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
    };

    void checkSession();
  }, []);

  if (hasSession === null) {
    return null;
  }

  if (hasSession) {
    return <SignOutButton />;
  }

  return (
    <a
      href="/auth/sign-in"
      className="rounded-full border border-white/10 px-4 py-1.5 text-sm font-medium text-white transition hover:border-cyan-300 hover:text-cyan-200"
    >
      Giriş Yap
    </a>
  );
}
